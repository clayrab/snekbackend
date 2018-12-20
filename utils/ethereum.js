const models = require('../model.js').models;
const utils = require("./utils.js");
const web3 = require("./web3Instance.js").web3;
const keyCache = require("./keyCache.js");
const crypt = require("./crypt.js");
const config = require("./config.js");

exports.checkRootBlock =  async() => {
  let rootBlock = await utils.find(models.instance.block, {number: config.rootBlockNumber});
  if(!rootBlock) {
    let block = await web3.eth.getBlock(config.rootBlockNumber);
    let newBlock = new models.instance.block({
      number: block.number,
      hashid: block.hash,
      timesReorged: 0,
    });
    await utils.save(newBlock);
  }
}
exports.subscribe = async() => {

}
exports.synchronize = async(makeApprovalConfirmationFunc) => {
  // on reorg or startup
  // find the latest known block
  // find all chainevents effected and update them
  // get past Events from last known block to new latest block and process
  // confirm latest is still latest and subscribe to events
  // TODO: get gaslimit Here

  let lastBlock = await web3.eth.getBlock('latest');
  let block = lastBlock;
  //let lastKnownBlockNumber = -1;
  let lastKnownBlockNumber = await web3.eth.getBlockNumber().then((value) => {return value;});
  // Find the latest block we have synced with
  while(true) {
    let previousBlock = await utils.find(models.instance.block, {number: lastKnownBlockNumber});
    if(previousBlock) {
      let ethBlock = await web3.eth.getBlock(lastKnownBlockNumber);
      if(previousBlock.hashid == ethBlock.hash) {
        break;
      }
    }
    lastKnownBlockNumber--;
  }
  console.log("latest block: " + lastBlock.number)
  console.log("latest synced block: " + lastKnownBlockNumber)

  // // Update any reorged blocks between last sync and latest block
  // for(let k = lastKnownBlockNumber + 1; k <= lastBlock.number; k++) {
  //   let reorgedBlock = await utils.find(models.instance.block, {number: k});
  //   let newBlock = await web3.eth.getBlock(k);
  //   if(!reorgedBlock){
  //     // new block
  //     reorgedBlock = new models.instance.block({
  //       number: k,
  //       hashid: newBlock.hash,
  //       timesReorged: 0,
  //     });
  //   } else {
  //     // reorged block
  //     reorgedBlock.timesReorged = reorgedBlock.timesReorged + 1;
  //     reorgedBlock.hashid = newBlock.hash;
  //   }
  //   await utils.save(reorgedBlock);
  // }
  // // More blocks might be in Cassandra still with number greater than latest block
  // let syncBlockNumber = lastBlock.number;
  // while(true) {
  //   syncBlockNumber++;
  //   let nextReorgedBlock = await utils.find(models.instance.block, {number: syncBlockNumber});
  //   if(!nextReorgedBlock){
  //     break;
  //   } else {
  //     nextReorgedBlock.hashid = "reorged";
  //     nextReorgedBlock.timesReorged = nextReorgedBlock.timesReorged + 1;
  //     await utils.save(nextReorgedBlock);
  //   }
  // }

  // Find past events and write them to the database
  let snekTokenContract = await exports.getContract("snekCoinToken");
  if(!snekTokenContract) {
    console.log("************************ Contracts not deployed. Please deploy!!!!! ************************")
  } else {
    await snekTokenContract.getPastEvents('Mine', {
        fromBlock: lastKnownBlockNumber + 1,
        //toBlock: lastBlockNumber,
      },
      async(error, events) => {
        if(error) {
          console.log("error occured while synchronizing past events")
        } else {
          console.log("events.length: "+ events.length);
          for(let i = 0; i < events.length; i++) {

            console.log(events[i])
            let userChainEvents = await utils.mustFind(models.instance.userchainevents, {userpubkey: events[i].returnValues.sender});
            let chainEvent = await utils.find(models.instance.chainevent, {txid: events[i].transactionHash});
            if(chainEvent == null) {
              // new event
              if(!userChainEvents.chainevents) {
                userChainEvents.chainevents = [events[i].transactionHash];
              } else {
                userChainEvents.chainevents.push(events[i].transactionHash);
              }
              await utils.save(userChainEvents);
              let newChainEvent = new models.instance.chainevent({
                txid: events[i].transactionHash,
                userpubkey: events[i].returnValues.sender,
                type: "Mine",
                blockhash: events[i].blockHash,
                blocknumber: events[i].blockNumber,
                timesReorged: 0,
                distReorged: 0,
              });
              await utils.save(newChainEvent);
            } else {
              // reorged event
              // should already be in userchainevents...
              let found = false;
              for(let j = 0; j < userChainEvents.chainevents.length; j++) {
                if(userChainEvents.chainevents[j] == events[i].transactionHash) {
                  found = true;
                  break;
                }
              }
              if(!found) {
                throw "Event not found in userchainevent. Database consistency error.";
              }
              chainEvent.timesReorged = chainEvent.timesReorged + 1;
              let distanceReorged = chainEvent.blocknumber - lastKnownBlockNumber;
              chainEvent.distReorged = chainEvent.distReorged + distanceReorged;
              await utils.save(chainEvent);
            }
          }
        }
        console.log("****** synchronization success ******");
      }
    );
  }
}
exports.sign = async(signer, nonce, amount, forUser) => {
  let ret = [];
  let data = (nonce * 2 ** 32) + amount;
  let hexData = web3.utils.toHex(data).slice(2);
  for(let i = hexData.length; i < 16; i++) {
    hexData = "0" + hexData
  }
  let message = "0x1337beef" + forUser.slice(2) + hexData;
  let sig = (await web3.eth.sign(message, signer)).slice(2);
  let r = "0x" + sig.slice(0, 64);
  let s = "0x" + sig.slice(64, 128);
  let v = web3.utils.toDecimal('0x' + sig.slice(128, 130)) + 27
  ret.push(message);
  ret.push(v);
  ret.push(r);
  ret.push(s);
  return ret;
}

exports.sendContractCall = async(user, method, options) => {
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
  let cassandraContract = await utils.find(models.instance.contract, {name: name});
  if(cassandraContract){
    let snekContract = new web3.eth.Contract(JSON.parse(cassandraContract.abi), cassandraContract.address);
    //}
    return snekContract;
  } else {
    return null;
  }
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
