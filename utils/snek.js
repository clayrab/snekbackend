const config = require("./config.js");
//const keyCache = require("./keyCache.js");
const crypt = require("./crypt.js");
const utils = require("./utils.js");
const fraud = require("./fraud.js");
const ethereum = require("./ethereum.js");
const models = require('../model.js').models;

exports.isFraud = async(user, howMany) => {
  return false;
}
exports.approveMine = async(user, howMany) => {
  if (true) {
    //let admin = await utils.mustFind(models.instance.user, {name: config.owner});
    let admin = {
      name: config.owner + "runtime",
      randomSecret: config.ownerSalt,
    };
    let snekContract = await ethereum.getContract("snekCoinToken");
    let receipt = await ethereum.sendContractCall(
      admin,
      snekContract.methods.approveMine(user.pubkey, howMany),
      { from: admin.pubkey, gas: 30000,}
    );
    return {};
  } else {
    throw "Cannot approve mine";
  }
}
exports.transfer = async(user, to, amount) => {
  let snekContract = ethereum.getContract("snekCoinToken");
  let receipt = await ethereum.sendContractCall(
    admin,
    snekContract.methods.transfer(to, howMany, user.pubkey),
    { from: user.pubkey, gas: 21000,}
  );
  return receipt;
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
  snekContract.methods.balanceOf(user.pubkey).call(function(error, result){
    if(error) {
      console.log(error);
      throw error;
    }
    return result;
  });
}
exports.getTotalSupply = async(user) => {
  let snekContract = await ethereum.getContract("snekCoinToken");
  //console.log(snekContract);
  snekContract.methods.totalSupply().call(function(error, result){
    if(error) {
      console.log(error);
      throw error;
    }
    return result;
  });
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
