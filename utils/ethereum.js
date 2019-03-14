const models = require('../model.js').models;
const utils = require("./utils.js");
const web3 = require("./web3Instance.js").web3;
const keyCache = require("./keyCache.js");
const crypt = require("./crypt.js");
const config = require("./config.js");
const ethereumjstx = require('ethereumjs-tx');

exports.checkRootBlock = async() => {
  let rootBlock = await utils.find(models.instance.block, {number: config.rootBlockNumber});
  if(rootBlock) {
    console.log("rootBlock OK")
  } else {
    console.log("Inserting root block: " + config.rootBlockNumber);
    let block = await web3.eth.getBlock(config.rootBlockNumber);
    let newBlock = new models.instance.block({
      number: block.number,
      hashid: block.hash,
      timesReorged: 0,
    });
    await utils.save(newBlock);
  }
}
exports.getSyncing = async() => {
  // Returns Object|Boolean - A sync object as follows, when the node is currently syncing or false:
  //  startingBlock: Number - The block number where the sync started.
  //  currentBlock: Number - The block number where at which block the node currently synced to already.
  //  highestBlock: Number - The estimated block number to sync to.
  return await new Promise(async(resolve, reject) => {
    web3.eth.isSyncing((error, result) => {
      if(error) {
         reject(error);
      } else {
        resolve(result);
      }
    });
  }).catch(err => {
    throw err
  });
}
exports.getGasPrice = async() => {
  let gasPrice = await web3.eth.getGasPrice();
  if(gasPrice == 1000000000) {
    console.log("here?")
    let networkID = await web3.eth.net.getId();
    console.log(networkID)
    if(networkID == 3) { // We're on ropsten. Increase the gas price arbitrarily.
      gasPrice = 20*gasPrice;
    }
  }
  return gasPrice;
}
// exports.paritySyncStatus = async() => {
//   try {
//     let block = await web3.eth.getBlock(config.rootBlockNumber);
//     if(!block){
//       return false;
//     }
//     return true;
//   } catch(err){
//     return false;
//   }
// }

exports.subscribe = async() => {
  // var subscription = web3.eth.subscribe('newBlockHeaders', function(error, result){
  //   if (error) {
  //     throw error;
  //   }
  // })
  // .on("data", function(blockHeader){
  //   exports.synchronize();
  // });
//  .on("error", console.error);
}
let syncPastEvents = async(lastSyncedBlockNumber, eventType) => {
  let snekTokenContract = await exports.getContract("snekCoinToken");
  if(!snekTokenContract) {
    console.log("************************ Contracts not deployed. Please deploy!!!!! ************************")
  } else {
    console.log("sync past events")
    await snekTokenContract.getPastEvents(eventType, {
        //fromBlock: lastSyncedBlockNumber + 1,
        fromBlock: lastSyncedBlockNumber,
        //toBlock: lastBlockNumber,
      },
      async(error, events) => {
        if(error) {
          console.log("error occured while synchronizing past events");
          console.log(error);
          throw error;
        } else {
          console.log("events.length: "+ events.length);
          for(let i = 0; i < events.length; i++) {
            //let userChainEvents = await utils.mustFind(models.instance.userchainevents, {userpubkey: events[i].returnValues.sender});
            let chainEvent = await utils.find(models.instance.chainevent, {txid: events[i].transactionHash});
            if(chainEvent == null) {
              // new event
              // if(!userChainEvents.chainevents) {
              //   userChainEvents.chainevents = [events[i].transactionHash];
              // } else {
              //   userChainEvents.chainevents.push(events[i].transactionHash);
              // }
              //await utils.save(userChainEvents;;
              let sender = "0x0000000000000000000000000000000000000000"; // creation of contract creates a Transfer tx with no sender
              if(events[i].returnValues && events[i].returnValues.sender){
                sender = events[i].returnValues.sender;
              }
              let newChainEvent = new models.instance.chainevent({
                pubkey: sender,
                txid: events[i].transactionHash,
                type: eventType,
                blockhash: events[i].blockHash,
                blocknumber: events[i].blockNumber,
                timesReorged: 0,
                distReorged: 0,
              });
              await utils.save(newChainEvent);
            } else {
              // reorged event
              // should already be in userchainevents...
              // let found = false;
              // for(let j = 0; j < userChainEvents.chainevents.length; j++) {
              //   if(userChainEvents.chainevents[j] == events[i].transactionHash) {
              //     found = true;
              //     break;
              //   }
              // }
              // if(!found) {
              //   throw "Event not found in userchainevent. Database consistency error.";
              // }
              if(chainEvent.blockhash != events[i].blockHash) {
                chainEvent.timesReorged = chainEvent.timesReorged + 1;
                let distanceReorged = chainEvent.blocknumber - lastSyncedBlockNumber;
                chainEvent.distReorged = chainEvent.distReorged + distanceReorged;
                await utils.save(chainEvent);
              }
            }
          }
        }
      }
    );
  }
}

let isBlockSynced = async(blockNumber) => {
  let dbBlock = await utils.find(models.instance.block, {number: blockNumber});
  if(dbBlock) {
    let ethBlock = await web3.eth.getBlock(blockNumber);
    if(dbBlock.hashid == ethBlock.hash) {
      return true;
    }
  }
  return false
}

findLastSyncedBlockBinarySearch = async(start, end) => {
  let mid = Math.floor((end + start)/2);
  if(end - 1 === mid ){ return isBlockSynced(mid)? mid: end;}
  console.log("binary searching at blocknumber: " + mid);
  if(await isBlockSynced(mid)){
    return findLastSyncedBlockBinarySearch(mid, end);
  } else {
    return findLastSyncedBlockBinarySearch(start, mid);
  }
}

exports.synchronize = async() => {
  // on reorg or startup
  // find the latest known block
  // find all chainevents effected and update them
  // get past Events from last known block to new latest block and process
  // confirm latest is still latest and subscribe to events
  // TODO: get gaslimit Here?
  console.log("syncing");
  let lastBlock = await web3.eth.getBlock('latest');
  console.log("latest block: " + lastBlock.number)
  //let block = lastBlock;
  // Find the latest block we have synced with
  let lastSyncedBlockNumber = lastBlock.number;//await web3.eth.getBlockNumber().then((value) => {return value;});//
  console.log("searching for last synced block...");
  lastSyncedBlockNumber = await findLastSyncedBlockBinarySearch(config.rootBlockNumber, lastBlock.number);

  // while(true) {
  //   //if(lastSyncedBlockNumber%1000 == 0){
  //     console.log("searching... " + lastSyncedBlockNumber);
  //   //}
  //   let previousBlock = await utils.find(models.instance.block, {number: lastSyncedBlockNumber});
  //   try{
  //     if(previousBlock) {
  //       let ethBlock = await web3.eth.getBlock(lastSyncedBlockNumber);
  //       if(previousBlock.hashid == ethBlock.hash) {
  //         break;
  //       }
  //     }
  //     lastSyncedBlockNumber--;
  //   } catch(err){
  //     console.log("could not find block lastSyncedBlockNumber: " + lastSyncedBlockNumber);
  //     throw err;
  //   }
  // }

  console.log("Syncing new blocks to DB... " + lastSyncedBlockNumber + " to " + lastBlock.number);
  for(let k = lastSyncedBlockNumber + 1; k <= lastBlock.number; k++) {
    if(k%1000 == 0){
      console.log("syncing... " + k);
    }
    let reorgedBlock = await utils.find(models.instance.block, {number: k});
    web3.eth.getBlock(k).then(async(newBlock) => {
      if(!reorgedBlock){
        // new block
        reorgedBlock = new models.instance.block({
          number: k,
          hashid: newBlock.hash,
          timesReorged: 0,
        });
      } else {
        if(k%100 == 0){
          console.log("reorged block: " + k);
        }
        // reorged block
        reorgedBlock.timesReorged = reorgedBlock.timesReorged + 1;
        reorgedBlock.hashid = newBlock.hash;
      }
      await utils.save(reorgedBlock);
    }).catch(err => {
      console.log("could not find block: " + k);
      throw err;
    });

  }
  // More blocks might be in Cassandra still with number greater than latest block
  console.log("mark future reorged blocks in DB... ");
  let syncBlockNumber = lastBlock.number;
  while(true) {
    if(lastSyncedBlockNumber%1000 == 0){
      console.log("unsyncing... " + lastSyncedBlockNumber);
    }
    syncBlockNumber++;
    let nextReorgedBlock = await utils.find(models.instance.block, {number: syncBlockNumber});
    if(!nextReorgedBlock){
      break;
    } else {
      nextReorgedBlock.hashid = "reorged";
      nextReorgedBlock.timesReorged = nextReorgedBlock.timesReorged + 1;
      await utils.save(nextReorgedBlock);
    }
  }
  // Find past events and write them to the database
  await syncPastEvents(lastSyncedBlockNumber, "Mine");
  await syncPastEvents(lastSyncedBlockNumber, "MineWithSnek");
  await syncPastEvents(lastSyncedBlockNumber, "Paid");
  await syncPastEvents(lastSyncedBlockNumber, "SetOwner");
  await syncPastEvents(lastSyncedBlockNumber, "SetRoot");
  await syncPastEvents(lastSyncedBlockNumber, "ChangeMiningPrice");
  await syncPastEvents(lastSyncedBlockNumber, "ChangeMiningSnekPrice");
  await syncPastEvents(lastSyncedBlockNumber, "Transfer");
  console.log("****** synchronization success ******");
}

exports.resyncAllPastEvents = async() => {

  await syncPastEvents(0, "Mine");
  await syncPastEvents(0, "MineWithSnek");
  await syncPastEvents(0, "Paid");
  await syncPastEvents(0, "SetOwner");
  await syncPastEvents(0, "SetRoot");
  await syncPastEvents(0, "ChangeMiningPrice");
  await syncPastEvents(0, "ChangeMiningSnekPrice");
  await syncPastEvents(0, "Transfer");
  console.log("****** synchronization success ******");
}

exports.sign = async(nonce, amount, forUser) => {
  let ret = [];
  let data = (nonce * 2 ** 32) + amount;
  let hexData = web3.utils.toHex(data).slice(2);
  for(let i = hexData.length; i < 16; i++) {
    hexData = "0" + hexData
  }
  let message = "0x1337beef" + forUser.slice(2) + hexData;
  let privateKey = await exports.getOwnerPrivKey();
  let sig = (await web3.eth.accounts.sign(message, privateKey)).signature.slice(2);
  //let sig = (await web3.eth.sign(message, signer)).slice(2);
  let r = "0x" + sig.slice(0, 64);
  let s = "0x" + sig.slice(64, 128);
  let v = web3.utils.toDecimal('0x' + sig.slice(128, 130)) + 27;
  if(v == 54) { v = 27;}
  if(v == 55) { v = 28;}
  ret.push(message);
  ret.push(v);
  ret.push(r);
  ret.push(s);
  return ret;
}

exports.estimateGas = async(user, method, options) => {
  return await new Promise(async(resolve, reject) => {
    exports.makeAcctFromCache(user.name, user.randomSecret).then((acct) => {
      web3.eth.accounts.wallet.add(acct);
      method.estimateGas(options).then(function(gasAmount){
        resolve(gasAmount);
      });
      web3.eth.accounts.wallet.remove(acct);
    }).catch(err => {
      reject(err);
    });
  }).catch(err => {
    throw err
  });
}

exports.sendContractCall = async(user, method, options, resolveTime = "onMined") => {
  return await new Promise(async(resolve, reject) => {
    exports.makeAcctFromCache(user.name, user.randomSecret).then((acct) => {
      web3.eth.accounts.wallet.add(acct);
      method.send(options, function(error, transactionHash){
      }).on('error', function(error){
        reject(error);
      }).on('transactionHash', function(transactionHash){
        console.log("txhash: " + transactionHash)
        if(resolveTime == "onSent") {
          resolve(transactionHash);
        }
      }).on('receipt', function(receipt){
        if(resolveTime == "onMined") {
          resolve(receipt);
        }
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
exports.getPrivateKeyFromCache = async(name, password) => {
  return await new Promise((resolve, reject) => {
    keyCache.keyCacheGet(name).then((value) => {
      let privKey = crypt.decrypt(value, name+password+config.aesSalt);
      resolve(privKey);
    }).catch(err => {
      console.log("error retreiving item from cache: " + name);
      // if(name === config.owner+"runtime"){
      //
      // }
      reject(err);
    });;
  }).catch(err => {throw err});
}
exports.makeAcctFromCache = async(name, secret) => {
  return await new Promise((resolve, reject) => {
    try {
      exports.getPrivateKeyFromCache(name, secret).then((privKey) => {
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

exports.sendEth = async(user, to, howMuch, resolveTime = "onMined") => {
  return await new Promise(async(resolve, reject) => {
    try {
      // await ethereum.sendEth(req.user, contract.address, txdata.amount, "onSent");
      console.log("sendeth")

      let gasPrice = await web3.eth.getGasPrice();
      let acct = await exports.makeAcctFromCache(user.name, user.randomSecret);
      //.then((acct) => {
      //let acct = await exports.makeAcctFromCache(name, password);
      web3.eth.accounts.wallet.add(acct);
      //let nonce = await web3.eth.getTransactionCount(user.pubkey);
      gasPrice = 12*gasPrice + 1000000000;
      console.log("gasPrice: " + gasPrice)
      console.log("gasPrice: " + gasPrice/1000000000 + " GWei")
      web3.eth.sendTransaction({
        //nonce: web3.utils.toHex(nonce) + 1,
        from: acct.address,
        to: to,
        value: howMuch,
        gas: 21000 + 10000,
        gasPrice: gasPrice,
      })
      .on('error', function(error){
        reject(error);
      }).on('transactionHash', function(transactionHash){
        console.log("on transactionHash");
        console.log("resolveTime: " + resolveTime);
        if(resolveTime == "onSent") {
          resolve(transactionHash);
        }
      }).on('receipt', function(receipt){
        if(resolveTime == "onMined") {
          resolve(receipt);
        }
      }).on('confirmation', function(confirmationNumber, receipt){
        // fires each time tx is mined up to the 24th confirmationNumber
        // console.log("confirmationNumber: " + confirmationNumber);
      }).then(function(newContractInstance){
        // console.log("newContractInstance.options.address");
        // console.log(newContractInstance.options.address);
      });
      web3.eth.accounts.wallet.remove(acct);
      // }).catch(err => {
      //   reject(err);
      //   //throw err
      // });
    } catch(err) {
      reject(err);
    }
  }).catch(err => {throw err});
}

let sendRaw = async(rawTx, privKey) => {
  return await new Promise((resolve, reject) => {
    var privateKey = Buffer.from(privKey, 'hex');
    var transaction = new ethereumjstx(rawTx);
    transaction.sign(privateKey);
    var serializedTx = transaction.serialize().toString('hex');
    web3.eth.sendSignedTransaction('0x' + serializedTx, function(err, result) {
      if(err) {
        reject(err);
      // } else {
      //   resolve(result);
      }
    })
    .on('transactionHash', function (hash) {
      console.log("sendRaw transactionHash: " + hash);
      //resolve(hash);
    })
    .on('receipt', function (receipt) {
      console.log("sendRaw receipt: " + receipt);
      console.log("sendRaw receipt.contractAddress: " + receipt.contractAddress);
      resolve(receipt);
    })
    .on('confirmation', function (confirmationNumber, receipt) {
      // console.log("sendRaw conf: " + confirmationNumber + " : " + receipt);
    })
    .on('error', (error) => {
      reject(error);
    });
  }).catch(err => {throw err});
}

exports.deployRaw = async(contractName, abi, args, nonceDELETEME) => {
  return await new Promise((resolve, reject) => {
    utils.mustNotFind(models.instance.contract, {name: contractName}).then(() => {
      exports.makeAcctFromCache(config.owner+"runtime", config.ownerSalt).then((acct) => {
        let privKey = acct.privateKey;
        //await ethereum.getPrivateKeyFromCache(config.owner+"runtime", config.ownerSalt);
        let contract = new web3.eth.Contract(abi.abi);
        let deployableBytecode = contract.deploy({
          data: abi.bytecode,
          arguments: args
        }).encodeABI();
        web3.eth.getTransactionCount(acct.address).then((nonce) => {
          var rawTx = {
            nonce: web3.utils.toHex(nonce),
            gasLimit: web3.utils.toHex(4400000),
            gasPrice: web3.utils.toHex(2000000000),
            data: deployableBytecode,
            from: web3.utils.toHex(acct.address),
            chainId: web3.utils.toHex(config.chainId),
          };
          sendRaw(rawTx, privKey.slice(2)).then((hash) => {
            resolve(hash);
          }).catch(err => {throw err});
        }).catch(err => {throw err});
      }).catch(err => {throw err});
    }).catch(err => {throw err});
  }).catch(err => {throw err});
}
exports.deploy = async(contractName, abi, args, from) => {
  return await new Promise((resolve, reject) => {
    //TODO: validate options
    var options = {
      gas: 4000000, // 4m is ~ the limit
      //gas: gasEstimate,
      //gasPrice: 1000000000000,
      gasPrice: 8000001,
      from: from,
    };
    let contract = new web3.eth.Contract(abi.abi);
    let tx = contract.deploy({data: abi.bytecode, arguments : args});

    utils.mustNotFind(models.instance.contract, {name: contractName}).then(() => {
      tx.send(options, function(error, transactionHash){
        console.log("transcationhash: " + transactionHash);
      }).on('error', function(error){
        reject(error);
      }).on('transactionHash', function(transactionHash){
        console.log("on transcationhash: " + transactionHash);
      }).on('receipt', function(receipt){
        console.log("receipt.contractAddress : " + receipt.contractAddress); // contains the new contract address
        resolve(receipt);
      }).on('confirmation', function(confirmationNumber, receipt){
        // fires each time tx is mined up to the 24th confirmationNumber
        console.log("confirmationNumber: " + confirmationNumber);
      }).then(function(newContractInstance){
        console.log("newContractInstance.options.address");
        console.log(newContractInstance.options.address);
      });
    }).catch(err => {
      reject(err);
    });
      //await utils.mustNotFind(models.instance.user,{name: options.name});
    //}).catch(err => {throw err});
  }).catch(err => {throw err});
}
exports.configureOwnerCache = async() => {
  let usermap = await utils.find(models.instance.usermap, {name: config.owner});
  if(!usermap) {
    console.log("****** NO OWNER FOUND IN USERMAP. PLEASE CREATE OWNER. ******");
  } else {
    let user = await utils.find(models.instance.user, {pubkey: usermap.pubkey});
    if(!user){
      console.log("****** NO OWNER FOUND. PLEASE CREATE OWNER. ******");
    } else {
      let privKey = crypt.decrypt(user.keycrypt, config.owner + config.ownerSalt + config.aesSalt);
      let runtimeKeyCrypt  = crypt.encrypt(privKey, config.owner+"runtime" + config.ownerSalt + config.aesSalt);
      await keyCache.keyCacheSet(config.owner + "runtime", runtimeKeyCrypt, 0);
      await keyCache.keyCacheSet(config.owner + "runtimepubkey", user.pubkey, 0);
      console.log(config.owner + "runtimepubkey: " + user.pubkey);
      let out = await keyCache.keyCacheGet(config.owner + "runtimepubkey");
      console.log(out)
      console.log("****** config owner key cache success ******");
    }
  }
}
exports.getOwnerPrivKey = async() => {
  let usermap = await utils.find(models.instance.usermap, {name: config.owner});
  if(!usermap) {
    console.log("****** NO OWNER FOUND IN USERMAP. PLEASE CREATE OWNER. ******");
  } else {
    let user = await utils.find(models.instance.user, {pubkey: usermap.pubkey});
    if(!user){
      console.log("****** NO OWNER FOUND. PLEASE CREATE OWNER. ******");
    } else {
      // let privKey = crypt.decrypt(user.keycrypt, config.owner + config.ownerSalt + config.aesSalt);
      // let runtimeKeyCrypt  = crypt.encrypt(privKey, config.owner+"runtime" + config.ownerSalt + config.aesSalt);
      let runtimeKeyCrypt = await keyCache.keyCacheGet(config.owner + "runtime");
      let privKey = crypt.decrypt(runtimeKeyCrypt, config.owner+"runtime" + config.ownerSalt + config.aesSalt);
      return privKey;
      //await keyCache.keyCacheSet(config.owner + "runtimepubkey", user.pubkey);
      console.log("****** config owner key cache success ******");
    }
  }
}
