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
// exports.mine = async(user, howMany) => {
//   // TODO: fraud
//   console.log("mine")
//   let isFraud = false;
//   // TODO: get this from the database:
//   let minableAmount = howMany;
//   if (!isFraud) {
//
//
//
//
//     let snekContract = await ethereum.getContract("snekCoinToken");
//     let nonce = await snekContract.methods.getUserNonce(user.pubkey).call();
//     let approvalSig = await ethereum.sign(nonce, minableAmount, user.pubkey);
//     let miningPrice = await snekContract.methods.getMiningPrice().call();
//     let gasPrice = await web3.eth.getGasPrice();
//     let method = snekContract.methods.mine(approvalSig[0], approvalSig[1], approvalSig[2], approvalSig[3]);
//     let options = {
//       from: user.pubkey,
//       gasPrice: gasPrice,
//       value: miningPrice,
//     };
//     let gasEst = await ethereum.estimateGas(user, method, options);
//     options.gas = gasEst + 10000;
//     let txhash = await ethereum.sendContractCall(user, method, options, "onSent");
//     return txhash;
//   } else {
//     throw "Cannot approve mine";
//   }
// }

// exports.mineWithSnek = async(user, howMany, snekContract, miningPrice) => {
// // TODO: fraud
//   console.log("minewithsnek")
//   try {
//     let isFraud = false;
//     // TODO: get this from the database:
//     let minableAmount = howMany;
//     if (!isFraud) {
//       let snekContract = await ethereum.getContract("snekCoinToken");
//       let miningPrice = await snekContract.methods.getMiningSnekPrice().call();
//
//       let nonce = await snekContract.methods.getUserNonce(user.pubkey).call();
//       let approvalSig = await ethereum.sign(nonce, minableAmount, user.pubkey);
//       let gasPrice = await web3.eth.getGasPrice();
//       let method = snekContract.methods.mineWithSnek(approvalSig[0], approvalSig[1], approvalSig[2], approvalSig[3], miningPrice);
//       let options = {
//         from: user.pubkey,
//         gasPrice: gasPrice,
//       };
//       options.gas = (await ethereum.estimateGas(user, method, options)) + 10000;
//       let ethBal = await ethereum.getBalance(user);
//       if(options.gas * gasPrice > ethBal) {
//         throw "Not enough ethereum to pay for gas"
//       }
//       let txhash = await ethereum.sendContractCall(user, method, options, "onSent");
//       return txhash;
//     } else {
//       throw "Cannot approve mine";
//     }
//   } catch(err) {
//     throw "error: " + err;
//   }
// }
exports.transferSnek = async(user, to, howMany) => {
  let snekContract = ethereum.getContract("snekCoinToken");
  let options = { from: user.pubkey, gas: 21000,};
  let method = snekContract.methods.transfer(to, howMany, user.pubkey);
  let txhash = await ethereum.sendContractCall(admin, method, options, "onSent");
  return txhash;
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
      //console.log(error);
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
  let receipt = await ethereum.sendContractCall(
    owner,
    snekBackContract.methods.setRoot(snekContract.options.address),
    {
      from: pubkey,
      gas: 3000000,
      gasPrice: 20000000000,
    },
    "onSent"
  );
  return receipt;
}
