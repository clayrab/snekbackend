const config = require("./config.js");
const keyCache = require("./keyCache.js");
const crypt = require("./crypt.js");
const utils = require("./utils.js");
const fraud = require("./fraud.js");
const ethereum = require("./ethereum.js");
const models = require('../model.js').models;
const web3 = require("./web3Instance.js").web3;

exports.isFraud = async(user, howMany) => {
  return false;
}
let isMineReady = async(previousNumberOfConf, numberOfConf, username, howMany) => {
  // if approveMine has N confirmations, we're ready to mine it
  if(previousNumberOfConf < config.confirmationsRequired && numberOfConf >= config.confirmationsRequired) {
    console.log("done approving!!");
    let user = await utils.mustFind(models.instance.user, {name: username});
    user.approved = howMany;
    await utils.save(user);
  }
}

exports.makeApprovalConfirmationFunc = function(username, howMany) {
  return async(lastBlockNumber, receipt) => {
    // prepare to mine if the number of confirmations has just now exceeded the requirement
    // insert event hash into block confirmedevents
    // update confblock on chainevent
    console.log("logConfirmation");
    let chainEvent = await utils.mustFind(models.instance.chainevent, {txid: receipt.transactionHash});
    if(chainEvent.type == "ApproveMine") {
      isMineReady(chainEvent.confblock - chainEvent.blocknumber, lastBlockNumber - chainEvent.blocknumber, username, howMany);
    }
    let newChainEvent = new models.instance.chainevent({
      txid: receipt.transactionHash,
      username: username,
      type: "ApproveMine",
      blocknumber: receipt.blockNumber,
      confblock: lastBlockNumber,
    });
    await utils.save(newChainEvent);
    // DO THIS FOR BLCOKS
    // models.instance.Person.update({userID:1234, age:32}, {
    //     info:{'$add':{'new2':'addition2'}},
    //     phones:{'$add': ['12345']},
    //     emails: {'$add': ['e@f.com']}
    // }, function(err){
    //     if(err) throw err;
    //     done();
    // });


  }
}

exports.approveMine = async(user, howMany) => {
  // TODO: check that mine isn't already approved
  // TODO: fraud
  if (true) {
    let pubkey = await keyCache.keyCacheGet(config.owner + "runtimepubkey");
    let owner = {
      name: config.owner + "runtime",
      randomSecret: config.ownerSalt,
    };
    let snekContract = await ethereum.getContract("snekCoinToken");
    let receipt = await ethereum.sendContractCall(
      owner,
      snekContract.methods.approveMine(user.pubkey, howMany),
      {
        from: pubkey,
        gas: 300000,
        gasPrice: 20000000000,
      },
      makeApprovalConfirmationFunc(user.name, howMany),
    );
    let newChainEvent = new models.instance.chainevent({
        txid: receipt.transactionHash,
        block: receipt.blockHash,
        username: user.name,
        type: "ApproveMine",
        confirmed: 0,
    });
    await utils.save(newChainEvent);
    return receipt;
  } else {
    throw "Cannot approve mine";
  }
}
let mine = async(user, howMany) => {
  let snekContract = await ethereum.getContract("snekCoinToken");
  let receipt = await ethereum.sendContractCall(
    user,
    snekContract.methods.mine(howMany),
     {
      from: user.pubkey,
      gas: 3000000,
      gasPrice: 20000000000,
      value: 30000,
    }
  );
  return receipt;
}
exports.synchronizeEvents = async() => {
  // when the server goes down, it's possible we missed some events.
  // this function should find any missed events and synchronize the database.
  // 1> get latest block number
  // 2> get latest synchronized block number
  // 3> get all events between last synced and latest

  let lastBlockNumber = await web3.eth.getBlockNumber().then((value) => { return value; });
  let latestSyncedBlock = 0;
  try {
    let latestSync = await utils.mustFind(models.instance.synchronization, {type: "blockchain"});
    latestSyncedBlock = latestSync.latest;
  } catch (err) {
    console.log(err);
    //ignore. unsync
  }
  console.log("synchronize")
  console.log(lastBlockNumber)
  console.log(latestSyncedBlock)
  let snekTokenContract = await ethereum.getContract("snekCoinToken");
  await snekTokenContract.getPastEvents('ApprovedMine', {
      fromBlock: latestSyncedBlock,
      toBlock: lastBlockNumber,
    },
    async(error, events) => {
      for(let i = 0; i < events.length; i++) {
        let username = null;
        let confirmations = 0;
        try {
          let chainEvent = await utils.mustFind(models.instance.chainevent, {txid: events[i].transactionHash});
          username = chainEvent.username;
        } catch(err) {
          // if not found, it should have been. Find the user via pubkey.
          let tx = await web3.eth.getTransaction(events[i].transactionHash);
          let user = await utils.mustFind(models.instance.user, {pubkey: tx.from});
          username = user.name;
        }
        let newConfirmations = lastBlockNumber-events[i].blockNumber;
        console.log("events[i]");
        //console.log(events[i]);
        console.log(events[i].returnValues.amount);
        let howMany = parseInt(events[i].returnValues.amount, 10);
        let approvalConfFunc = makeApprovalConfirmationFunc(username, howMany);
        // call it for any confirmations we missed while offline
        approvalConfFunc(lastBlockNumber, events[i]);

        let chainevent = new models.instance.chainevent({
          txid: events[i].transactionHash,
          block: events[i].blockHash,
          username: username,
          type: "ApproveMine",
          confirmed: newConfirmations,
        });
        await utils.save(chainevent);
      }
      let sync = new models.instance.synchronization({
        type: "blockchain",
        latest: lastBlockNumber - config.confirmationsRequired,
      });
      console.log(sync.latest);
      await utils.save(sync);
      console.log("****** synchronize events success ******");
    }
  )

}
exports.transfer = async(user, to, amount) => {
  // let snekContract = ethereum.getContract("snekCoinToken");
  // let receipt = await ethereum.sendContractCall(
  //   admin,
  //   snekContract.methods.transfer(to, howMany, user.pubkey),
  //   { from: user.pubkey, gas: 21000,}
  // );
  // return receipt;
}
exports.getMiningPrice = async(user) => {
  let snekContract = ethereum.getContract("snekCoinToken");
  snekContract.methods.getMiningPrice().call(function(error, result){
    if(error) {
      throw error;
    }
    return result;
  });
}
exports.getMiningSnekPrice = async(user) => {
  let snekContract = ethereum.getContract("snekCoinToken");
  snekContract.methods.getMiningSnekPrice().call(function(error, result){
    if(error) {
      throw error;
    }
    return result;
  });
}
exports.getBalance = async(user) => {
  let snekContract = await ethereum.getContract("snekCoinToken");
  return await snekContract.methods.balanceOf(user.pubkey).call(function(error, result){
    if(error) {
      console.log(error);
      throw error;
    }
    return result;
  });
}
exports.getTotalSupply = async(user) => {
  let snekContract = await ethereum.getContract("snekCoinToken");
  return await snekContract.methods.totalSupply().call(function(error, result){
    if(error) {
      console.log(error);
      throw error;
    }
    return result;
  });
}

exports.getOwner = async(user) => {
  let snekContract = await ethereum.getContract("snekCoinToken");
  return await snekContract.methods.getOwner().call(function(error, result){
    if(error) {
      console.log(error);
      throw error;
    }
    return result;
  });
}
exports.getRoot = async(user) => {
  let snekContract = await ethereum.getContract("snekCoinToken");
  return await snekContract.methods.getRoot().call(function(error, result){
    if(error) {
      console.log(error);
      throw error;
    }
    return result;
  });
}
exports.getSender = async(user) => {
  let snekContract = await ethereum.getContract("snekCoinToken");
  return await snekContract.methods.getSender().call(function(error, result){
    if(error) {
      console.log(error);
      throw error;
    }
    return result;
  });
}
exports.setRoot = async() => {
  let snekContract = await ethereum.getContract("snekCoinToken");
  let snekBackContract = await ethereum.getContract("snekCoinBack");
  let pubkey = await keyCache.keyCacheGet(config.owner + "runtimepubkey");
  let owner = {
    name: config.owner + "runtime",
    randomSecret: config.ownerSalt,
  };
  console.log("setroot")
  console.log(JSON.stringify(owner))
  console.log(pubkey)
  console.log(snekContract.options.address)
  //console.log(snekBackContract.address)

  let receipt = await ethereum.sendContractCall(
    owner,
    snekBackContract.methods.setRoot(snekContract.options.address),
     {
      from: pubkey,
      gas: 3000000,
      gasPrice: 20000000000,
    }
  );
  return receipt;
}
// function approveMine(S storage s, address who, uint256 amount) public returns(bool);
// function isMineApproved(S storage s, address who) public view returns(uint256);
// function changeMiningPrice(S storage s, uint256 amount)public returns(bool);
// function changeMiningSnekPrice(S storage s, uint256 amount) public returns(bool);
// function getMiningPrice(S storage s) public view returns(uint256);
// function getMiningSnekPrice(S storage s) public view returns(uint256);
// function mine(S storage s, uint256 amount, address sender, uint256 value) public returns(bool);
// function mineWithSnek(S storage s, uint256 amount, address sender, uint256 payAmount) public returns(bool);
// // ****** END CONTRACT BUSINESS FUNCTIONS ******
//
//
// // ****** BEGIN ERC20 ******
// function totalSupply(S storage s) public constant returns(uint256);
// function balanceOf(S storage s, address tokenOwner) public view returns(uint256);
// function allowance(S storage s, address tokenOwner, address spender) public view returns (uint256);
// function transfer(S storage s, address to, uint256 tokens, address sender) public returns (bool);
// function approve(S storage s, address spender, uint256 tokens, address sender) public returns (bool);
// function transferFrom(S storage s, address from, address to, uint256 tokens, address sender) public returns (bool);
