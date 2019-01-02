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

exports.synchronizeEventsRoute = async (req, res, next) => {
  if(req.user.name == config.owner){
    snek.synchronizeEvents(req.user);
    utils.ok200({status: "done"}, res);
  } else {
    console.log("here?");
    utils.error401Unauthorized(res);
  }
}
exports.getLastGasRoute = async (req, res, next) => {
  console.log("get last block?")
  let lastBlock = await web3.eth.getBlock('latest');
  console.log("ok")
  utils.ok200({lastBlock: lastBlock}, res);
}
exports.getEventsRoute = async (req, res, next) => {
  // let snekTokenContract = await ethereum.getContract("snekCoinToken");
  // let events = snekTokenContract.events.allEvents({fromBlock: 0, toBlock: 'latest'});
  // console.log(events);

  // snekTokenContract.getPastEvents('ApprovedMine', {
  //     //filter: {myIndexedParam: [20,23], myOtherIndexedParam:'0x123456789...'}, // Using an array means OR: e.g. 20 or 23
  //     fromBlock: 0,
  //     toBlock: 'latest'
  //   },
  //   function(error, events){
  //     // console.log("error");
  //     // console.log(error);
  //     // console.log(events);
  //     for(let i = 0; i < events.length; i++) {
  //       console.log(events[i].event)
  //     }
  //   }
  // )
  utils.ok200({}, res);
}

exports.getOwnerRoute = async (req, res, next) => {
  //let snekContract = ethereum.getContract("snekCoinToken");
  let owner = await snek.getOwner(req.user);
  let snekBal = await snek.getTotalSupply();
  let root = await snek.getRoot();
  let sender = await snek.getSender();
  keyCache.keyCacheGet(config.owner + "runtimepubkey").then((value) =>{
    utils.ok200({sender: sender, root: root, configowner: value, owner: owner}, res);
  });
}

exports.setRootRoute = async (req, res, next) => {
  let receipt = await snek.setRoot();
  utils.ok200({receipt: receipt}, res);
}
exports.rewardHaulRoute = async (req, res, next) => {
  try {
    if(!req.body.howmany){
      throw "Must provide howmany";
    }
    if(!req.body.powerups){
      throw "Must provide powerups";
    }
    if(!req.body.levelname){
      throw "Must provide levelname";
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

    let newGame = new models.instance.game({
      pubkey: user.pubkey,
      time: '2015-05-03 13:30:54.234',
      levelname : req.body.levelname,
      score     : howMany,
      powerups  : powerups,
    });
    await utils.save(newGame);
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
exports.getGames = async(req, res, next) => {
  //0x627306090abaB3A6e1400e9345bC60c78a8BEf57

  let user = await utils.find(models.instance.game,{pubkey: req.user.pubkey});
  utils.ok200(user, res);
}


exports.makeFakeGames = async (req, res, next) => {
  let user = await utils.mustFind(models.instance.user,{pubkey: req.user.pubkey});
  newGame = new models.instance.game({
    pubkey: user.pubkey,
    time: '2015-05-03 1:30:54.234',
    levelname : "req.body.levelname",
    score     : 100,
    powerups  : 100,
  });
  await utils.save(newGame);
  newGame = new models.instance.game({
    pubkey: user.pubkey,
    time: '2015-05-03 3:30:54.234',
    levelname : "req.body.levelname",
    score     : 100,
    powerups  : 100,
  });
  await utils.save(newGame);
  newGame = new models.instance.game({
    pubkey: user.pubkey,
    time: '2015-05-03 11:30:54.234',
    levelname : "req.body.levelname",
    score     : 100,
    powerups  : 100,
  });
  await utils.save(newGame);
  newGame = new models.instance.game({
    pubkey: user.pubkey,
    time: '2015-05-03 14:30:54.234',
    levelname : "req.body.levelname",
    score     : 100,
    powerups  : 100,
  });
  await utils.save(newGame);
  newGame = new models.instance.game({
    pubkey: user.pubkey,
    time: '2015-05-03 13:30:54.234',
    levelname : "req.body.levelname",
    score     : 100,
    powerups  : 100,
  });
  await utils.save(newGame);
  newGame = new models.instance.game({
    pubkey: user.pubkey,
    time: '2015-05-03 12:30:54.234',
    levelname : "req.body.levelname",
    score     : 100,
    powerups  : 100,
  });
  await utils.save(newGame);
  newGame = new models.instance.game({
    pubkey: user.pubkey,
    time: '2015-05-03 2:30:54.234',
    levelname : "req.body.levelname",
    score     : 100,
    powerups  : 100,
  });
  await utils.save(newGame);
  utils.ok200(newGame, res);
}

exports.rewardUnredeemedRoute = async (req, res, next) => {
  try {
    if(!req.body.howmany){
      throw "Must provide howmany";
    }
    //let usermap = await utils.mustFind(models.instance.usermap,{name: req.user.name});
    let user = await utils.mustFind(models.instance.user,{pubkey: req.user.pubkey});

    //approveMine
    let howMany = parseInt(req.body.howmany, 10);
    if(user.haul >= user.mineMax) {
      throw "Cannot haul any more";
    }
    if(howMany > config.gameMax || howMany < 0) {
      throw "Howmany must be between 0 and 100";
    }
    if(user.haul + howMany > user.mineMax) {
      howMany = user.mineMax - user.haul;
    }
    user.unredeemed = user.unredeemed + howMany;
    user.haul = user.haul + howMany;
    user.haul = user.haul + howMany;
    await utils.save(user);
    utils.ok200(user, res);;
  } catch(err) {
    next(err);
  }
}
exports.freeMineRoute = async (req, res, next) => {
  try {
    if(!req.body.howmany){
      throw "Must provide howmany";
    }
    let howMany = parseInt(req.body.howmany, 10);
    let snekContract = ethereum.getContract("snekCoinToken");
    snek.approveMine(req.user, howMany);
    let receipt = await ethereum.sendContractCall(
      req.user,
      snekContract.methods.mineWithSnek(1000), {
      from: req.user.pubkey,
      gas: 3000000,
      value: 100,
    });
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
    // let value = crypt.encrypt("secret", "password");
    // let out = crypt.decrypt(value, "password");
    // utils.ok200({out: out}, res);
    let howMany = parseInt(req.body.howmany, 10);
    let receipt = await snek.mine(req.user, howMany);
    utils.ok200(receipt, res);
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
  try {
    let snekContract = await ethereum.getContract("snekCoinToken");
    let snekBal = await snek.getBalance(req.user);
    let ethBal = await ethereum.getBalance(req.user);
    //let user = await utils.mustFind(models.instance.user, {name: req.user.name});
    let user = await utils.mustFind(models.instance.user, {pubkey: req.user.pubkey});
    let unredeemedBal = user.unredeemed;
    let balances = {
      eth: ethBal,
      snek: snekBal,
      pubkey: user.pubkey,
      name: user.name,
      unredeemed: unredeemedBal,
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

    let snekCoin0_0_1Txhash = await ethereum.deployRaw("snekCoin0_0_1", abis.snekCoin0_0_1, []);
    let snekCoin0_0_1Receipt = await web3.eth.getTransactionReceipt(snekCoin0_0_1Txhash);
    console.log("deployed snekCoin0_0_1");
    console.log("saving...");
    let nonce = await web3.eth.getTransactionCount(owner.pubkey);
    console.log(nonce);
    await utils.save(
      new models.instance.contract({
        nonce: nonce,
        name: "snekCoin0_0_1",
        owner: req.user.name,
        address: snekCoin0_0_1Receipt.contractAddress,
        abi: JSON.stringify(abis.snekCoin0_0_1.abi),
        bytecode: abis.snekCoin0_0_1.bytecode,
      })
    );
    console.log("OK");
    //let dispatcherStorageDepl = await ethereum.deploy("dispatcherStorage", abis.dispatcherStorage, [snekCoin0_0_1Receipt.contractAddress], owner.pubkey);
    let dispatcherStorageTxhash = await ethereum.deployRaw("dispatcherStorage", abis.dispatcherStorage, [snekCoin0_0_1Receipt.contractAddress]);
    let dispatcherStorageReceipt = await web3.eth.getTransactionReceipt(dispatcherStorageTxhash);
    await utils.save(
      new models.instance.contract({
        name: "dispatcherStorage",
        owner: req.user.name,
        address: dispatcherStorageReceipt.contractAddress,
        abi: JSON.stringify(abis.dispatcherStorage.abi),
        bytecode: abis.dispatcherStorage.bytecode,
      })
    );

    abis.dispatcher.bytecode = abis.dispatcher.bytecode.replaceAll('1111222233334444555566667777888899990000', dispatcherStorageReceipt.contractAddress.slice(2));
    let dispatcherTxhash = await ethereum.deployRaw("dispatcher", abis.dispatcher, []);
    let dispatcherReceipt = await web3.eth.getTransactionReceipt(dispatcherTxhash);
    await utils.save(
      new models.instance.contract({
        name: "dispatcher",
        owner: req.user.name,
        address: dispatcherReceipt.contractAddress,
        abi: JSON.stringify(abis.dispatcher.abi),
        bytecode: abis.dispatcher.bytecode,
      })
    );

    abis.snekCoinBack.bytecode = abis.snekCoinBack.bytecode.replaceAll('__LibInterface__________________________', dispatcherReceipt.contractAddress.slice(2))
    let snekCoinArgs = [web3.utils.asciiToHex(req.body.name), req.body.decimals, req.body.totalSupply];
    let snekCoinBackTxhash = await ethereum.deployRaw("snekCoinBack", abis.snekCoinBack, snekCoinArgs);
    let snekCoinBackReceipt = await web3.eth.getTransactionReceipt(snekCoinBackTxhash);
    await utils.save(
      new models.instance.contract({
        name: "snekCoinBack",
        owner: req.user.name,
        address: snekCoinBackReceipt.contractAddress,
        abi: JSON.stringify(abis.snekCoinBack.abi),
        bytecode: abis.snekCoinBack.bytecode,
      })
    );

    let snekCoinTokenTxhash = await ethereum.deployRaw("snekCoinToken", abis.snekCoinToken, [snekCoinBackReceipt.contractAddress]);
    let snekCoinTokenReceipt = await web3.eth.getTransactionReceipt(snekCoinTokenTxhash);
    await utils.save(
      new models.instance.contract({
        name: "snekCoinToken",
        owner: req.user.name,
        address: snekCoinTokenReceipt.contractAddress,
        abi: JSON.stringify(abis.snekCoinToken.abi),
        bytecode: abis.snekCoinToken.bytecode,
      })
    );

    let snekContract = await ethereum.getContract("snekCoinToken");
    let snekBackContract = await ethereum.getContract("snekCoinBack");
    let pubkey = await keyCache.keyCacheGet(config.owner + "runtimepubkey");
    let runtimeOwner = {
      name: config.owner + "runtime",
      randomSecret: config.ownerSalt,
    };

    let receipt = await ethereum.sendContractCall(
      runtimeOwner,
      snekBackContract.methods.setRoot(snekContract.options.address),
       {
        from: pubkey,
        gas: 50000,
        gasPrice: 20000000000,
      }
    );

    utils.ok200({setRootReceipt: receipt}, res);
  } catch (err) {
    next(err);
  }
}
