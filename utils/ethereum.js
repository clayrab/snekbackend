const models = require('../model.js').models;
const utils = require("./utils.js");
const web3 = require("./web3Instance.js").web3;
const keyCache = require("./keyCache.js");
const crypt = require("./crypt.js");
const config = require("./config.js");

// exports.link = function() {
//   dispatcher.bytecode = dispatcher.bytecode.replace('1111222233334444555566667777888899990000', dispatcherStorageDepl.contractAddress.slice(2));
// }
//let snekContract = null;
exports.synchronize = async(makeApprovalConfirmationFunc) => {
  let snekContract = await exports.getContract("snekCoinToken");
  // on reorg or startup
  // find the latest known block
  // find all chainevents effected and update them
  // get past Events from last known block to new latest block and process
  // confirm latest is still latest and subscribe to events
  // TODO: get gaslimit Here

  // Find the latest block we have synced with
  let lastBlockNumber = await web3.eth.getBlockNumber().then((value) => {return value;});
  let lastBlock = await web3.eth.getBlock(lastBlockNumber);
  let block = lastBlock;
  let lastKnownBlock = null;
  let found = false;
  while(!found && lastBlockNumber != 0) {
    block = await web3.eth.getBlock(lastBlockNumber);
    try {
      lastKnownBlock = await utils.mustFind(models.instance.block, {hashid: block.hash});
      found = true;
    } catch(err){
      lastBlockNumber--;
    }
  }

  // get the block
  // nuke all the blocks that were reorged and update the confirmations on affected chainevents(ApprovedMine confirmations)
  let nextBlock = await utils.mustFind(models.instance.block, {hashid: lastKnownBlock.nexthash});
  lastKnownBlock.nexthash = null;
  while(nextBlock.nexthash != null) {
    nextBlock = await utils.mustFind(models.instance.block, {hashid: nextBlock.nexthash});
    //loop through confirmations and update the chainevents
  }

  await snekTokenContract.getPastEvents('ApprovedMine', {
      fromBlock: lastKnownBlock.number+1,
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
          username: username,
          type: "ApproveMine",
          blocknumber: events[i].blockNumber,
          confblock: lastBlockNumber,
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

  // store "nexthash" in previous block


  // let previousBlocksHash = await utils.mustFind(models.instance.block, {
  //   $orderby:{ '$desc' :'number' },
  //   $limit: 11
  // });
  // while(previousBlocksHash)
  // utils.find(models.instance.block, {hashid: block.hash})
  // console.log(lastBlockNumber)
  // console.log(latestSyncedBlock)

console.log("DONE")
  //
  // snekContract.events.ApprovedMine({
  //   //filter: {myIndexedParam: [20,23], myOtherIndexedParam: '0x123456789...'}, // Using an array means OR: e.g. 20 or 23
  //   fromBlock: 0
  // }, function(error, event){
  //   //console.log(event);
  // })
  // .on('data', function(event){
  //   //console.log(event); // same results as the optional callback above
  // })
  // .on('changed', function(event){
  //   // Fires on each event which was removed from the blockchain. The event will have the additional property "removed: true".
  //
  // })
  // .on('error', console.error);
  //subscribe to ApproveMine event -> makeApprovalConfirmationFunc
  // ethereum.watchChain(() => {
  //   snek.synchronizeEvents();
  // })
  //snek.synchronizeEvents();
}
exports.sendContractCall = async(user, method, options, confCallback) => {
  return await new Promise(async(resolve, reject) => {
    exports.makeAcctFromCache(user.name, user.randomSecret).then((acct) => {
      web3.eth.accounts.wallet.add(acct);
      method.send(options, function(error, transactionHash){
      }).on('error', function(error){
        reject(error);
      }).on('transactionHash', function(transactionHash){
      }).on('receipt', function(receipt){
        resolve(receipt);
      }).on('confirmation', function(confirmationNumber, receipt){
        // fires each time tx is mined up to the 24th confirmationNumber
        // if(confCallback) {
        //   confCallback(confirmationNumber, receipt);
        // }
      }).then(function(newContractInstance){
      });
      web3.eth.accounts.wallet.remove(acct);
    }).catch(err => {
      reject(err);
    });
  }).catch(err => {
    throw err
  });
}
exports.getContract = async(name) => {
  //if (!snekContract) {
  let cassandraContract = await utils.mustFind(models.instance.contract, {name: name});
  let snekContract = new web3.eth.Contract(JSON.parse(cassandraContract.abi), cassandraContract.address);
  //}
  return snekContract;
}
exports.getBalance = async(user) => {
  return await new Promise(async(resolve, reject) => {
    await web3.eth.getBalance(user.pubkey, function(error, result) {
      if(error){
        console.log(error);
      }
      resolve(result);
    });
  }).catch(err => {throw err});
}
exports.makeAcctFromCache = async(name, password) => {
  return await new Promise((resolve, reject) => {
    try {
      keyCache.keyCacheGet(name).then((value) =>{
        let privKey = crypt.decrypt(value, name+password+config.aesSalt);
        let acct = web3.eth.accounts.privateKeyToAccount(privKey);
        resolve(acct);
      }).catch(err => {
        reject(err);
      });
    } catch(err) {
      reject(err);
    }
  }).catch(err => {throw err});
}
exports.sendEth = async(name, password, to, howMuch) => {
  return await new Promise(async(resolve, reject) => {
    try {
      let acct = await exports.makeAcctFromCache(name, password);
      web3.eth.accounts.wallet.add(acct);
      web3.eth.sendTransaction({
        from: acct.address,
        to: to,
        value: howMuch,
        gas: 21000,
      })
      .on('error', function(error){
        reject(error);
      }).on('transactionHash', function(transactionHash){
        //console.log("on transcationhash: " + transactionHash);
      }).on('receipt', function(receipt){
        resolve(receipt);
      }).on('confirmation', function(confirmationNumber, receipt){
        // fires each time tx is mined up to the 24th confirmationNumber
        // console.log("confirmationNumber: " + confirmationNumber);
      }).then(function(newContractInstance){
        // console.log("newContractInstance.options.address");
        // console.log(newContractInstance.options.address);
      });
      web3.eth.accounts.wallet.remove(acct);
    } catch(err) {
      reject(err);
    }
  }).catch(err => {throw err});
}

exports.deploy = async(contractName, abi, args, from) => {
  return await new Promise((resolve, reject) => {
    //TODO: validate options
    var options = {
      gas: 4000000, // 4m is ~ the limit
      //gas: gasEstimate,
      gasPrice: 1000000000,
      from: from,
    };
    let contract = new web3.eth.Contract(abi.abi);
    let tx = contract.deploy({data: abi.bytecode, arguments : args});
    utils.mustNotFind(models.instance.contract, {name: contractName}).then(() => {
      tx.send(options, function(error, transactionHash){
        //console.log("transcationhash: " + transactionHash);
      }).on('error', function(error){
        reject(error);
      }).on('transactionHash', function(transactionHash){
        //console.log("on transcationhash: " + transactionHash);
      }).on('receipt', function(receipt){
        console.log("receipt.contractAddress : " + receipt.contractAddress); // contains the new contract address
        resolve(receipt);
      }).on('confirmation', function(confirmationNumber, receipt){
        // fires each time tx is mined up to the 24th confirmationNumber
        // console.log("confirmationNumber: " + confirmationNumber);
      }).then(function(newContractInstance){
        // console.log("newContractInstance.options.address");
        // console.log(newContractInstance.options.address);
      });
    }).catch(err => {
      reject(err);
    });
      //await utils.mustNotFind(models.instance.user,{name: options.name});
    //}).catch(err => {throw err});
  }).catch(err => {throw err});
}
