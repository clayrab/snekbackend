const models = require('../model.js').models;
const utils = require("./utils.js");
const web3 = require("./web3Instance.js").web3;
const keyCache = require("./keyCache.js");
const crypt = require("./crypt.js");
const config = require("./config.js");
const ethereumjstx = require('ethereumjs-tx');

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
let syncPastEvents = async(lastKnownBlockNumber, eventType) => {
  let snekTokenContract = await exports.getContract("snekCoinToken");
  if(!snekTokenContract) {
    console.log("************************ Contracts not deployed. Please deploy!!!!! ************************")
  } else {
    await snekTokenContract.getPastEvents(eventType, {
        fromBlock: lastKnownBlockNumber + 1,
        //toBlock: lastBlockNumber,
      },
      async(error, events) => {
        if(error) {
          console.log("error occured while synchronizing past events")
        } else {
          console.log("events.length: "+ events.length);
          for(let i = 0; i < events.length; i++) {
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
      }
    );
  }
}
exports.synchronize = async() => {
  // on reorg or startup
  // find the latest known block
  // find all chainevents effected and update them
  // get past Events from last known block to new latest block and process
  // confirm latest is still latest and subscribe to events
  // TODO: get gaslimit Here
  console.log("syncing");
  let lastBlock = await web3.eth.getBlock('latest');
  console.log("latest block: " + lastBlock.number)
  let block = lastBlock;
  //let lastKnownBlockNumber = -1;
  let lastKnownBlockNumber = await web3.eth.getBlockNumber().then((value) => {return value;});
  // Find the latest block we have synced with
  while(true) {
    if(lastKnownBlockNumber%1000 == 0){
      console.log(lastKnownBlockNumber)
    }
    let previousBlock = await utils.find(models.instance.block, {number: lastKnownBlockNumber});
    if(previousBlock) {
      let ethBlock = await web3.eth.getBlock(lastKnownBlockNumber);
      if(previousBlock.hashid == ethBlock.hash) {
        break;
      }
    }
    lastKnownBlockNumber--;
  }

  console.log("latest synced block: " + lastKnownBlockNumber)
  // Update any reorged blocks between last sync and latest block
  for(let k = lastKnownBlockNumber + 1; k <= lastBlock.number; k++) {
    let reorgedBlock = await utils.find(models.instance.block, {number: k});
    let newBlock = await web3.eth.getBlock(k);
    if(!reorgedBlock){
      // new block
      reorgedBlock = new models.instance.block({
        number: k,
        hashid: newBlock.hash,
        timesReorged: 0,
      });
    } else {
      // reorged block
      reorgedBlock.timesReorged = reorgedBlock.timesReorged + 1;
      reorgedBlock.hashid = newBlock.hash;
    }
    await utils.save(reorgedBlock);
  }
  // More blocks might be in Cassandra still with number greater than latest block
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
  await syncPastEvents(lastKnownBlockNumber, "Mine");
  await syncPastEvents(lastKnownBlockNumber, "MineWithSnek");
  await syncPastEvents(lastKnownBlockNumber, "Paid");
  await syncPastEvents(lastKnownBlockNumber, "SetOwner");
  await syncPastEvents(lastKnownBlockNumber, "SetRoot");
  await syncPastEvents(lastKnownBlockNumber, "ChangeMiningPrice");
  await syncPastEvents(lastKnownBlockNumber, "ChangeMiningSnekPrice");
  console.log("****** synchronization success ******");
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
  console.log("sig: " + sig)
  console.log("sig.slice(128, 130) " + sig.slice(128, 130))
  let v = web3.utils.toDecimal('0x' + sig.slice(128, 130)) + 27;
  console.log("v: " + v);
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
exports.getPrivateKeyFromCache = async(name, password) => {
  return await new Promise((resolve, reject) => {
    keyCache.keyCacheGet(name).then((value) => {
      let privKey = crypt.decrypt(value, name+password+config.aesSalt);
      resolve(privKey);
    }).catch(err => {
      reject(err);
    });;
  }).catch(err => {throw err});
}
exports.makeAcctFromCache = async(name, password) => {
  return await new Promise((resolve, reject) => {
    try {
      exports.getPrivateKeyFromCache(name, password).then((privKey) => {
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

let sendRaw = async(rawTx, privKey) => {
  return await new Promise((resolve, reject) => {
    var privateKey = Buffer.from(privKey, 'hex');
    var transaction = new ethereumjstx(rawTx);
    transaction.sign(privateKey);
    var serializedTx = transaction.serialize().toString('hex');
    web3.eth.sendSignedTransaction('0x' + serializedTx, function(err, result) {
      if(err) {
        reject(err);
      } else {
        console.log("else")
        console.log(result)
        resolve(result);
      }
    })
    .on('transactionHash', function (hash) {
      console.log("transactionHash")
      console.log(hash)
      resolve(hash);
    })
    // .on('receipt', function (receipt) {
    // console.log("receipt: " + receipt)
    // })
    // .on('confirmation', function (confirmationNumber, receipt) {
    // console.log("conf: " + confirmationNumber, receipt)
    // })
    .on('error', (error) => {
      reject(error);
    });
  }).catch(err => {throw err});
}

exports.deployRaw = async(contractName, abi, args) => {
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
            gasLimit: web3.utils.toHex(4000000),
            gasPrice: web3.utils.toHex(1000000000),
            data: deployableBytecode,
            from: web3.utils.toHex(acct.address),
            chainId: web3.utils.toHex(config.chaidId),
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
  let user = await utils.find(models.instance.user, {name: config.owner});
  if(!user){
    console.log("****** NO OWNER FOUND. PLEASE CREATE OWNER. ******");
  } else {
    let privKey = crypt.decrypt(user.keycrypt, config.owner + config.ownerSalt + config.aesSalt);
    let runtimeKeyCrypt  = crypt.encrypt(privKey, config.owner+"runtime" + config.ownerSalt + config.aesSalt);
    await keyCache.keyCacheSet(config.owner + "runtime", runtimeKeyCrypt);
    await keyCache.keyCacheSet(config.owner + "runtimepubkey", user.pubkey);
    console.log("****** config owner key cache success ******");
  }
}
