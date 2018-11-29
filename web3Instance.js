var web3 = require('web3');
exports.web3 = new web3(web3.givenProvider || "ws://127.0.0.1:9545");
