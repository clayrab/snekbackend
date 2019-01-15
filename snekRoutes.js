const models = require('./model.js').models;
const config = require("./utils/config.js");
const keyCache = require("./utils/keyCache.js");
const utils = require("./utils/utils.js");
const crypt = require("./utils/crypt.js");
const snek = require("./utils/snek.js");
const ethereum = require("./utils/ethereum.js");
const web3 = require("./utils/web3Instance.js").web3;
require("./utils/String.js");
let abis = {
  snekToken: require('./eth/abi/SnekCoinToken.json'),
  dispatcher: require('./eth/abi/Dispatcher.json'),
  dispatcherStorage: require('./eth/abi/DispatcherStorage.json'),
  snekCoinBack: require('./eth/abi/SnekCoinBack.json'),
  snekCoinToken: require('./eth/abi/SnekCoinToken.json'),
  snekCoin0_0_1: require('./eth/abi/SnekCoin0_0_1.json'),
}


exports.payRoute = async (req, res, next) => {
  utils.ok200({status: "OK"}, res);
}
exports.paySnekRoute = async (req, res, next) => {
  utils.ok200({status: "OK"}, res);
}
exports.recordScoreRoute = async (req, res, next) => {
  try {
    if(!req.body.howmany){
      throw "Must provide howmany";
    }
    if(!req.body.level){
      throw "Must provide level";
    }
    let howMany = parseInt(req.body.howmany, 10);
    let level = parseInt(req.body.level, 10);
    //let usermap = await utils.mustFind(models.instance.usermap,{name: req.user.name});
    let user = await utils.mustFind(models.instance.user, {pubkey: req.user.pubkey});

    if(user.haul >= user.mineMax) {
      throw "Cannot haul any more";
    }
    if(howMany > config.gameMax || howMany < 0) {
      //TODO LOG EVENT
      throw "Howmany must be between 0 and " + config.gameMax;
    }
    user.unredeemed = user.unredeemed + howMany;
    if(user.haul + howMany > user.mineMax) {
      howMany = user.mineMax - user.haul;
    }
    user.haul = user.haul + howMany;
    await utils.save(user);

    let timestamp = new Date().toISOString();
    let newGame = new models.instance.game({
      pubkey: user.pubkey,
      time: timestamp,
      level: level,
      score: howMany,
    });
    await utils.save(newGame);

    utils.ok200({status : "OK", score: howMany, user: user}, res);
  } catch(err) {
    next(err);
  }
}
exports.mineGame = async (req, res, next) => {
  try {
    if(!req.body.howmany){
      throw "Must provide howmany";
    }
    let user = await utils.mustFind(models.instance.user,{pubkey: req.user.pubkey});
    let howMany = parseInt(req.body.howmany, 10);
    let powerups = parseInt(req.body.powerups, 10);
    if(user.haul >= user.mineMax) {
      throw "Cannot haul any more";
    }
    if(howMany > config.gameMax || howMany < 0) {
      throw "Howmany must be between 0 and 100";
    }
    // if(user.haul + howMany > user.mineMax) {
    //   howMany = user.mineMax - user.haul;
    // }


    user.unredeemed = user.unredeemed + howMany;
    user.haul = user.haul + howMany;
    user.totalhaul = user.totalhaul + howMany;
    user.gamescount = user.gamescount + 1;
    await utils.save(user);
    utils.ok200(user, res);;
  } catch(err) {
    next(err);
  }
}

exports.getLastGasRoute = async (req, res, next) => {
  let lastBlock = await web3.eth.getBlock('latest');
  utils.ok200({lastBlock: lastBlock}, res);
}
exports.getPricesRoute = async (req, res, next) => {
  console.log("getPricesRoute")
  let ret = {};
  let snekContract = await ethereum.getContract("snekCoinToken");
  ret.miningPrice = await snekContract.methods.getMiningPrice().call();
  utils.ok200(ret, res);
}

exports.getOwnerRoute = async (req, res, next) => {
  let snekContract = ethereum.getContract("snekCoinToken");
  let owner = await snekContract.getOwner(req.user);
  let snekBal = await snekContract.getTotalSupply();
  let root = await snekContract.getRoot();
  let sender = await snekContract.getSender();
  keyCache.keyCacheGet(config.owner + "runtimepubkey").then((value) =>{
    utils.ok200({sender: sender, root: root, configowner: value, owner: owner}, res);
  });
}

exports.setRootRoute = async (req, res, next) => {
  let receipt = await snek.setRoot();
  utils.ok200({receipt: receipt}, res);
}

exports.getGamesRoute = async(req, res, next) => {
  console.log("getGames *********")
  //0x627306090abaB3A6e1400e9345bC60c78a8BEf57
  //let user = await utils.find(models.instance.game,{pubkey: req.user.pubkey});
  let games = await utils.findAll(models.instance.game, {pubkey: req.user.pubkey});
  utils.ok200({games: games}, res);
}
exports.freeMineRoute = async (req, res, next) => {
  try {
    if(!req.body.howmany){
      throw "Must provide howmany";
    }
    let howMany = parseInt(req.body.howmany, 10);
    let snekContract = ethereum.getContract("snekCoinToken");

    utils.ok200({status: receipt}, res);
  } catch(err) {
    next(err);
  }
}

exports.mineRoute = async (req, res, next) => {
  // TODO req.body.howmany req.body.price
  try {
    if(!req.body.howmany){
      throw "Must provide howmany";
    }
    let howMany = parseInt(req.body.howmany, 10);
    let txhash = await snek.mine(req.user, howMany);
    utils.ok200({txhash: txhash}, res);
  }
  catch(err) {
    next(err);
  }
}
exports.sendEthRoute = async (req, res, next) => {
  //validate req.body.to
  try {
    let receipt = await ethereum.sendEth(req.user, req.body.to, req.body.howmany);
    utils.ok200(receipt, res);
  } catch(err) {
    next(err);
  }
}
exports.sendSnekRoute =  async (req, res, next) => {
  //validate req.body.to
  try {
    let receipt = await snek.transfer(req.user, req.body.to, req.body.howmany);
    utils.ok200(receipt, res);
  } catch(err) {
    next(err);
  }
}
exports.getUserRoute = async (req, res, next) => {
  console.log("getuser");
  try {
    let snekContract = await ethereum.getContract("snekCoinToken");
    let snekBal = await snek.getBalance(req.user);
    let ethBal = await ethereum.getBalance(req.user);
    let user = await utils.mustFind(models.instance.user, {pubkey: req.user.pubkey});
    let balances = {
      eth: ethBal,
      snek: snekBal,
      pubkey: user.pubkey,
      name: user.name,
      unredeemed: user.unredeemed,
      mineMax: user.mineMax,
      haul: user.haul,
      gamecount: user.gamecount,
      totalhaul: user.totalhaul,
    };
    utils.ok200(balances, res);
  } catch(err) {
    next(err);
  }
}

exports.getBlockRoute = async(req, res, next) => {
  let ethBlock = await web3.eth.getBlock(40);
  utils.ok200({ethBlock: ethBlock}, res);
}

exports.createSnekTokenRoute = async(req, res, next) => {
  // TODO validate
  // TODO Needs to be broken into 5 separate APIs like getOrDeploy()
  if(!req.body.name || !req.body.decimals || !req.body.totalSupply){
    throw "must supply name, decimals, and totalSupply";
  }
  // validate is owner
  if(req.user.name != config.owner) {
    throw "only owner can deploy contracts";
  }
  try {
    let owner = await utils.mustFind(models.instance.user, {pubkey: req.user.pubkey});
    let nonce = await web3.eth.getTransactionCount(owner.pubkey);
    console.log("nonce:" + nonce);
    let snekCoin0_0_1 = await utils.find(models.instance.contract, {name: "snekCoin0_0_1"});
    let snekCoin0_0_1Address = null;
    if(snekCoin0_0_1){
      snekCoin0_0_1Address = snekCoin0_0_1.address;
    } else {
      let snekCoin0_0_1Receipt = await ethereum.deployRaw("snekCoin0_0_1", abis.snekCoin0_0_1, [], nonce);
      nonce = nonce + 1;
      //let snekCoin0_0_1Receipt = await web3.eth.getTransactionReceipt(snekCoin0_0_1Txhash);
      await utils.save(
        new models.instance.contract({
          name: "snekCoin0_0_1",
          owner: req.user.name,
          address: snekCoin0_0_1Receipt.contractAddress,
          abi: JSON.stringify(abis.snekCoin0_0_1.abi),
          bytecode: abis.snekCoin0_0_1.bytecode,
        })
      );
      snekCoin0_0_1Address = snekCoin0_0_1Receipt.contractAddress;
    }
    console.log("snekCoin0_0_1Address: " + snekCoin0_0_1Address);
    let dispatcherStorage = await utils.find(models.instance.contract, {name: "dispatcherStorage"});
    let dispatcherStorageAddress = null;
    if(dispatcherStorage){
      dispatcherStorageAddress = dispatcherStorage.address;
    } else {
      console.log("deploying dispatcherStorage");
      let dispatcherStorageReceipt = await ethereum.deployRaw("dispatcherStorage", abis.dispatcherStorage, [snekCoin0_0_1Address], nonce);
      nonce = nonce + 1;
      //let dispatcherStorageReceipt = await web3.eth.getTransactionReceipt(dispatcherStorageTxhash);
      console.log("deployed dispatcherStorage: " + dispatcherStorageReceipt);
      console.log("deployed dispatcherStorage receipt: " + dispatcherStorageReceipt.contractAddress);
      await utils.save(
        new models.instance.contract({
          name: "dispatcherStorage",
          owner: req.user.name,
          address: dispatcherStorageReceipt.contractAddress,
          abi: JSON.stringify(abis.dispatcherStorage.abi),
          bytecode: abis.dispatcherStorage.bytecode,
        })
      );
      dispatcherStorageAddress = dispatcherStorageReceipt.contractAddress;
    }
    let dispatcher = await utils.find(models.instance.contract, {name: "dispatcher"});
    let dispatcherAddress = null;
    if(dispatcher){
      dispatcherAddress = dispatcher.address;
    } else {
      console.log("deploying dispatcher");
      abis.dispatcher.bytecode = abis.dispatcher.bytecode.replaceAll('1111222233334444555566667777888899990000', dispatcherStorageAddress.slice(2));
      let dispatcherReceipt = await ethereum.deployRaw("dispatcher", abis.dispatcher, [], nonce);
      nonce = nonce + 1;
      //let dispatcherReceipt = await web3.eth.getTransactionReceipt(dispatcherTxhash);
      await utils.save(
        new models.instance.contract({
          name: "dispatcher",
          owner: req.user.name,
          address: dispatcherReceipt.contractAddress,
          abi: JSON.stringify(abis.dispatcher.abi),
          bytecode: abis.dispatcher.bytecode,
        })
      );
      dispatcherAddress = dispatcherReceipt.contractAddress;
    }

    let snekCoinBack = await utils.find(models.instance.contract, {name: "snekCoinBack"});
    let snekCoinBackAddress = null;
    if(snekCoinBack){
      snekCoinBackAddress = snekCoinBack.address;
    } else {
      console.log("deploying snekCoinBack");
      abis.snekCoinBack.bytecode = abis.snekCoinBack.bytecode.replaceAll('__LibInterface__________________________', dispatcherAddress.slice(2))
      let snekCoinArgs = [web3.utils.asciiToHex(req.body.name), req.body.decimals, req.body.totalSupply];
      let snekCoinBackReceipt = await ethereum.deployRaw("snekCoinBack", abis.snekCoinBack, snekCoinArgs, nonce);
      nonce = nonce + 1;
      //let snekCoinBackReceipt = await web3.eth.getTransactionReceipt(snekCoinBackTxhash);
      await utils.save(
        new models.instance.contract({
          name: "snekCoinBack",
          owner: req.user.name,
          address: snekCoinBackReceipt.contractAddress,
          abi: JSON.stringify(abis.snekCoinBack.abi),
          bytecode: abis.snekCoinBack.bytecode,
        })
      );
      snekCoinBackAddress = snekCoinBackReceipt.contractAddress;
    }

    let snekCoinToken = await utils.find(models.instance.contract, {name: "snekCoinToken"});
    if(!snekCoinToken){
      console.log("deploying snekCoinToken");
      let snekCoinTokenReceipt = await ethereum.deployRaw("snekCoinToken", abis.snekCoinToken, [snekCoinBackAddress], nonce);
      nonce = nonce + 1;
      //let snekCoinTokenReceipt = await web3.eth.getTransactionReceipt(snekCoinTokenTxhash);
      await utils.save(
        new models.instance.contract({
          name: "snekCoinToken",
          owner: req.user.name,
          address: snekCoinTokenReceipt.contractAddress,
          abi: JSON.stringify(abis.snekCoinToken.abi),
          bytecode: abis.snekCoinToken.bytecode,
        })
      );
    }
    console.log("all deployed");
    let snekContract = await ethereum.getContract("snekCoinToken");
    let snekBackContract = await ethereum.getContract("snekCoinBack");
    let pubkey = await keyCache.keyCacheGet(config.owner + "runtimepubkey");
    let runtimeOwner = {
      name: config.owner + "runtime",
      randomSecret: config.ownerSalt,
    };
    console.log("setting Root")
    let receipt = await ethereum.sendContractCall(
      runtimeOwner,
      snekBackContract.methods.setRoot(snekContract.options.address),
      {
        from: pubkey,
        gas: 150000,
        gasPrice: 20000000000,
      }
    );
    utils.ok200({setRootReceipt: receipt}, res);
  } catch (err) {
    next(err);
  }
}
