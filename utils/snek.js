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
function signAsOwner(signer, nonce, amount, forUser) {
  let ret = [];
  let data = (nonce * 2 ** 32) + amount;
  let hexData = web3._extend.utils.toHex(data).slice(2)
  for(let i = hexData.length; i < 16; i++) {
    hexData = "0" + hexData
  }
  let message = "0x1337beef" + forUser.slice(2) + hexData;
  //let msg = web3.sha3(hexData, {encoding: "hex"}); // 256 bit number as hex-encoded string.
  let sig = web3.eth.sign(signer, message).slice(2);
  let r = "0x" + sig.slice(0, 64);
  let s = "0x" + sig.slice(64, 128);
  let v = web3.toDecimal('0x' + sig.slice(128, 130)) + 27
  ret.push(message);
  ret.push(v);
  ret.push(r);
  ret.push(s);
  return ret;
}
exports.mine = async(user, howMany) => {
  // TODO: fraud
  let isFraud = false;
  // TODO: get this from the database:
  let minableAmount = howMany;
  if (!isFraud) {
    let ownerPubkey = await keyCache.keyCacheGet(config.owner + "runtimepubkey");
    let owner = {
      name: config.owner + "runtime",
      randomSecret: config.ownerSalt,
    };
    let snekContract = await ethereum.getContract("snekCoinToken");
    let nonce = await snekContract.methods.getUserNonce(user.pubkey).call();
     //retData.balance = await dgtSubContract.methods.balanceOf(req.user.pubkey).call(function(error, result){
    let approvalSig = await ethereum.sign(ownerPubkey, nonce, minableAmount, user.pubkey);
    let miningPrice = await snekContract.methods.getMiningPrice().call();
    let gasPrice = await web3.eth.getGasPrice();
    let receipt = await ethereum.sendContractCall(
      owner,
      snekContract.methods.mine(approvalSig[0], approvalSig[1], approvalSig[2], approvalSig[3]),
      {
        from: ownerPubkey,
        gas: 300000,
        gasPrice: gasPrice,
        value: miningPrice,
      },
    );
    // let newChainEvent = new models.instance.chainevent({
    //     txid: receipt.transactionHash,
    //     block: receipt.blockHash,
    //     username: user.name,
    //     type: "ApproveMine",
    //     confirmed: 0,
    // });
    // await utils.save(newChainEvent);
    return receipt;
  } else {
    throw "Cannot approve mine";
  }
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
