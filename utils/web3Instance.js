const config = require("./config.js");
const web3 = require('web3');

if(config.currentEnv == "dev"){
  exports.web3 = new web3(web3.givenProvider || "ws://127.0.0.1:9545");
  //exports.web3 = new web3(web3.givenProvider || new web3.providers.HttpProvider("http://localhost:8545"));
} else if(config.currentEnv == "qa"){
  exports.web3 = new web3(web3.givenProvider || new web3.providers.HttpProvider("http://202.182.117.196:8545"));
} else if(config.currentEnv == "prod"){
  exports.web3 = new web3(web3.givenProvider || new web3.providers.HttpProvider("http://localhost:8545"));
}
