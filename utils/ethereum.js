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
        if(confCallback) {
          confCallback(confirmationNumber, receipt);
        }
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
