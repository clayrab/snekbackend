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

exports.websockets = {};
let markTransaction = async(chainEvent) => {
  console.log("markTransaction")
  let dbTxs = await utils.findAll(models.instance.transaction, {pubkey: chainEvent.pubkey});
  console.log(chainEvent.txid)
  for (let dbTx of dbTxs) {
    if(dbTx.txhash === chainEvent.txid){
      console.log("Tx found.")
      dbTx.pending = false;
      await utils.save(dbTx);

      //let socket = await keyCache.keyCacheGet("socketID" + socket.handshake.query.pubkey);
      //socket.emit("MINED", dbTx.txid);
      let socket = exports.websockets[chainEvent.pubkey];
      if(socket) {
        console.log("emit")
        socket.emit("MINED", dbTx.txid);
      }
      return;
    }
  }
  //if(chainEvent.type ==)
  console.log("Transaction not found in database. Data consistency error. This must be investigated.");
  console.log("chainevent txid: " + chainEvent.txid)
  console.log("chainEvent.type: " + chainEvent.type)
}

let syncPastEvents = async(firstUnsyncedBlockNumber, lastBlockNumber, eventType) => {
  let snekTokenContract = await exports.getContract("snekCoinToken");
  if(!snekTokenContract) {
    console.log("************************ Contracts not deployed. Please deploy!!!!! ************************")
  } else {
    //console.log("sync past events")
    await snekTokenContract.getPastEvents(eventType, {
        //fromBlock: firstUnsyncedBlockNumber + 1,
        fromBlock: firstUnsyncedBlockNumber,
        toBlock: lastBlockNumber,
      },
      async(error, events) => {
        if(error) {
          console.log("error occured while synchronizing past events");
          console.log(error);
          throw error;
        } else {
          if(events.length > 0){
            console.log("Found " + events.length + " " + eventType + " events.");
          }
          for(let i = 0; i < events.length; i++) {
            //let userChainEvents = await utils.mustFind(models.instance.userchainevents, {userpubkey: events[i].returnValues.sender});
            let chainEvent = await utils.find(models.instance.chainevent, {txid: events[i].transactionHash});
            if(chainEvent == null) {
              // new event
              console.log("new chain event")
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
              await markTransaction(newChainEvent);
            } else {
              // reorged event
              if(chainEvent.blockhash != events[i].blockHash) {
                chainEvent.timesReorged = chainEvent.timesReorged + 1;
                let distanceReorged = chainEvent.blocknumber - firstUnsyncedBlockNumber;
                chainEvent.distReorged = chainEvent.distReorged + distanceReorged;
                await utils.save(chainEvent);
                await markTransaction(chainEvent);
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
  return false;
}

findLastSyncedBlockBinarySearch = async(start, end) => {
  let mid = Math.floor((end + start)/2);
  if(end - 1 === mid ){
    return isBlockSynced(mid) ? mid : end;
  }
  console.log("binary searching at blocknumber: " + mid);
  if(await isBlockSynced(mid)){
    return findLastSyncedBlockBinarySearch(mid, end);
  } else {
    return findLastSyncedBlockBinarySearch(start, mid);
  }
}
findReasonableFirstBlock = async(lastBlockNumber) => {
  // 15 sec blocks
  let isSynced = await isBlockSynced(lastBlockNumber);
  if(isSynced) {
    return lastBlockNumber;
  }
  let recentSyncedBlock = lastBlockNumber - 1;
  while(!isSynced){
    recentSyncedBlock -= (lastBlockNumber - recentSyncedBlock); // Look twice as far back
    isSynced = await isBlockSynced(recentSyncedBlock);
  }
  return recentSyncedBlock;
}
exports.syncInterval = null;
exports.synchronize = async() => {
  // on reorg or startup
  // find the latest known block
  // find all chainevents effected and update them
  // get past Events from last known block to new latest block and process
  // confirm latest is still latest and subscribe to events
  // TODO: get gaslimit Here?
  try{
    console.log("syncing");
    let lastBlock = await web3.eth.getBlock('latest');
    //console.log("latest block: " + lastBlock.number)
    // Find the latest block we have synced with
    let lastSyncedBlockNumber = lastBlock.number;//await web3.eth.getBlockNumber().then((value) => {return value;});//
    //console.log("searching for last synced block...");
    let startBlock = await findReasonableFirstBlock(lastBlock.number);
    if(startBlock === lastBlock.number){
      console.log("Already synced. " + lastBlock.number + ". No-op.")
    } else {
      //lastSyncedBlockNumber = await findLastSyncedBlockBinarySearch(config.rootBlockNumber, lastBlock.number);
      console.log("Searching from " + startBlock + " to " + lastBlock.number);
      lastSyncedBlockNumber = await findLastSyncedBlockBinarySearch(startBlock, lastBlock.number);
      console.log("lastSyncedBlockNumber: " + lastSyncedBlockNumber);
      //console.log("Syncing new blocks to DB... " + lastSyncedBlockNumber + " to " + lastBlock.number);
      for(let k = lastSyncedBlockNumber + 1; k <= lastBlock.number; k++) {
        web3.eth.getBlock(k).then(async(newBlock) => {
          let reorgedBlock = await utils.find(models.instance.block, {number: k});
          if(!reorgedBlock){
            // new block
            console.log("new block: " + k);
            reorgedBlock = new models.instance.block({
              number: k,
              hashid: newBlock.hash,
              timesReorged: 0,
            });
          } else {
            console.log("reorged block: " + k);
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
      //console.log("mark future reorged blocks in DB... ");
      let syncBlockNumber = lastBlock.number;
      while(true) {
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
      await syncPastEvents(lastSyncedBlockNumber + 1, lastBlock.number, "Mine");
      await syncPastEvents(lastSyncedBlockNumber + 1, lastBlock.number, "MineWithSnek");
      await syncPastEvents(lastSyncedBlockNumber + 1, lastBlock.number, "Paid");
      await syncPastEvents(lastSyncedBlockNumber + 1, lastBlock.number, "SetOwner");
      await syncPastEvents(lastSyncedBlockNumber + 1, lastBlock.number, "SetRoot");
      await syncPastEvents(lastSyncedBlockNumber + 1, lastBlock.number, "ChangeMiningPrice");
      await syncPastEvents(lastSyncedBlockNumber + 1, lastBlock.number, "ChangeMiningSnekPrice");
      await syncPastEvents(lastSyncedBlockNumber + 1, lastBlock.number, "Transfer");
    }
  } catch(err) {
    console.log("***** Error during sync. Ignoring. *****");
    console.log(err);
  }
  //console.log("****** synchronization complete ******");
  // Schedule another sync in 8 seconds. Eth has 15 second blocks so 7.5 is
  // the Nyquist frequency. 8 is close enough.
  exports.syncInterval = setTimeout(() => {
    exports.synchronize();
  }, 8000);
}

exports.resyncAllPastEvents = async() => {
  let lastBlock = await web3.eth.getBlock('latest');
  await syncPastEvents(0, lastBlock.number, "Mine");
  await syncPastEvents(0, lastBlock.number, "MineWithSnek");
  await syncPastEvents(0, lastBlock.number, "Paid");
  await syncPastEvents(0, lastBlock.number, "SetOwner");
  await syncPastEvents(0, lastBlock.number, "SetRoot");
  await syncPastEvents(0, lastBlock.number, "ChangeMiningPrice");
  await syncPastEvents(0, lastBlock.number, "ChangeMiningSnekPrice");
  await syncPastEvents(0, lastBlock.number, "Transfer");
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
