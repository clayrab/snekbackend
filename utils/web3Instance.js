const config = require("./config.js");
const web3 = require('web3');
console.log("web3")
try{
  if(config.currentEnv == "dev"){
    //exports.web3 = new web3(web3.givenProvider || "ws://127.0.0.1:9545"); // truffle
    exports.web3 = new web3(web3.givenProvider || new web3.providers.HttpProvider("http://127.0.0.1:8545")); // parity
    //192.168.1.5
    //exports.web3 = new web3(web3.givenProvider || new web3.providers.HttpProvider("http://202.182.117.196:8545")); // QA parity
  } else if(config.currentEnv == "qa"){
    exports.web3 = new web3(web3.givenProvider || new web3.providers.HttpProvider("http://202.182.117.196:8545")); // QA parity
    //exports.web3 = new web3(web3.givenProvider || new web3.providers.HttpProvider("http://localhost:8545")); // parity
  } else if(config.currentEnv == "prod"){
    exports.web3 = new web3(web3.givenProvider || new web3.providers.HttpProvider("http://127.0.0.1:8545"));
  }
} catch(err){
  console.log("cannot connect to Ethereum node.")
  console.log(err)
  throw err;
}
