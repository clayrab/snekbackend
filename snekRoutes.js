const models = require('./model.js').models;
const config = require("./utils/config.js");
const keyCache = require("./utils/keyCache.js");
const utils = require("./utils/utils.js");
const crypt = require("./utils/crypt.js");
const web3 = require("./web3Instance.js").web3;

var snekToken = require('./eth/abi/SnekCoinToken.json');
var dispatcher = require('./eth/abi/Dispatcher.json');
var dispatcherStorage = require('./eth/abi/DispatcherStorage.json');
var snekCoinBack = require('./eth/abi/SnekCoinBack.json');
var snekCoinToken = require('./eth/abi/SnekCoinToken.json');
var snekCoin0_0_1 = require('./eth/abi/SnekCoin0_0_1.json');

exports.createSnekTokenRoute = async(req, res, next) => {
  // TODO validate
  if(!req.body.name || !req.body.decimals || !req.body.totalSupply){
    throw "must supply name, decimals, and totalSupply";
  }
  // validate is owner
  if(req.user.name != "clayrab") {
    throw "only owner can deploy contracts";
  }
  try {
    // snek001 = await SnekCoin0_0_1.new();
    // snek00x = await SnekCoin0_0_X.new();
    // dispatcherStorage = await DispatcherStorage.new(snek001.address);
    // Dispatcher.unlinked_binary = Dispatcher.unlinked_binary
    //     .replace(exampleDispatcherStorage.address.slice(2),
    //         dispatcherStorage.address.slice(2));
    // dispatcher = await Dispatcher.new();
    // SnekCoinBack.link('LibInterface', dispatcher.address);
    // snekcoinback = await SnekCoinBack.new("TestContract", 20, 1000000);
    // snekcointoken = await SnekCoinToken.new(snekcoinback.address);
    // snekcoinback.setRoot(snekcointoken.address);
    // fakesnekcointoken = await SnekCoinToken.new(snekcoinback.address);

    let args = [web3.utils.asciiToHex(req.body.name), req.body.decimals, req.body.totalSupply];
    var block = await web3.eth.getBlock("latest");
    //let gasEstimate = await web3.eth.estimateGas({data: snekCoinBack.bytecode});
    let rewardContract = new web3.eth.Contract(snekCoin0_0_1.abi);
    let deployTx = rewardContract.deploy({data: snekCoin0_0_1.bytecode, arguments : []});
    console.log("snekCoinBack.bytecode: " + snekCoin0_0_1.bytecode);
    console.log(snekCoinBack.unlinked_binary);
    //console.log("gasLimit: " + block.gasLimit);
    //console.log("gas estimate:" + snekCoinBack.bytecode);
    //utils.ok200(deployTx, res);
    deployTx.send({
      from: req.user.pubkey,
      gas: 4000000, // 4m is ~ the limit
      //gas: gasEstimate,
      gasPrice: 1,
      from: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
    }, function(error, transactionHash){
      console.log("transcationhash: " + transactionHash);
    })
    .on('error', function(error){
      console.log("error: " + error);
    })
    .on('transactionHash', function(transactionHash){
      console.log("on transcationhash: " + transactionHash);
    })
    .on('receipt', function(receipt){
      console.log("receipt.contractAddress"); // contains the new contract address
      console.log(receipt.contractAddress); // contains the new contract address
      var newContract = new models.instance.contract({
          name: req.body.name,
          version_major: 0,
          version_minor: "001",
          address: receipt.contractAddress,
          abi: snekCoin0_0_1.abi,
      });
      newContract.save(function(err){
        utils.ok200(newContract, res);
      });
    })
    .on('confirmation', function(confirmationNumber, receipt){
      // fires each time tx is mined up to the 24th confirmationNumber
      console.log("confirmationNumber: " + confirmationNumber);
     })
    .then(function(newContractInstance){
      console.log("newContractInstance.options.address");
      console.log(newContractInstance.options.address);
    });

  } catch (err) {
    next(err);
  }
}

exports.rewardPreTokensRoute = async (req, res, next) => {
  try {
    if(!req.body.howmany){
      throw "Must provide howmany";
    }
    let user = await utils.mustFind(models.instance.user,{name: req.user.name});
    let howMany = parseInt(req.body.howmany, 10);
    if(user.haul >= user.mineMax) {
      throw "Cannot haul any more";
    }
    if(howMany > 100 || howMany < 0) {
      throw "Howmany must be between 0 and 100";
    }
    if(user.haul + howMany > user.mineMax) {
      howMany = user.mineMax - user.haul;
    }
    user.unredeemed = user.unredeemed + howMany;
    user.haul = user.haul + howMany;
    await utils.save(user);
    utils.ok200(user, res);;
  } catch(err) {
    next(err);
  }
}

exports.freeMine = async (req, res, next) => {
  try {
    let value = await keyCache.keyCacheGet(req.user.name);
    let privKey = crypt.decrypt(value, req.user.name+req.user.randomSecret+config.aesSalt);
    let acct = web3.eth.accounts.privateKeyToAccount(privKey);
    utils.ok200(privKey, res);
  } catch(err) {
    next(err);
  }
}

exports.mine = async (req, res, next) => {
  try {
    let value = await keyCache.keyCacheGet(req.user.name);
    let privKey = crypt.decrypt(value, req.user.name+req.user.randomSecret+config.aesSalt);
    let acct = web3.eth.accounts.privateKeyToAccount(privKey);
    utils.ok200(privKey, res);
  }
  catch(err) {
    next(err);
  }
}
