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
    console.log("here?")
    utils.error401Unauthorized(res)
  }
}

exports.getEventsRoute = async (req, res, next) => {
  // let snekTokenContract = await ethereum.getContract("snekCoinToken");
  // // let events = snekTokenContract.events.allEvents({fromBlock: 0, toBlock: 'latest'});
  // // console.log(events);
  //
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
exports.rewardPreTokensRoute = async (req, res, next) => {
  try {
    if(!req.body.howmany){
      throw "Must provide howmany";
    }
    let user = await utils.mustFind(models.instance.user,{name: req.user.name});
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
    let receipt = await snek.approveMine(req.user, howMany);
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
exports.getBalances = async (req, res, next) => {
  try {
    let snekContract = await ethereum.getContract("snekCoinToken");
    let snekBal = await snek.getBalance(req.user);
    let ethBal = await ethereum.getBalance(req.user);
    let user = await utils.mustFind(models.instance.user, {name: req.user.name});
    let unredeemedBal = user.unredeemed;
    let balances = {
      eth: ethBal,
      snek: snekBal,
      unredeemed: unredeemedBal,
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
    let owner = await utils.mustFind(models.instance.user, {name: req.user.name});
    let snekCoinArgs = [web3.utils.asciiToHex(req.body.name), req.body.decimals, req.body.totalSupply];
    let snekCoin001Depl = await ethereum.deploy("snekCoin0_0_1", abis.snekCoin0_0_1, [], owner.pubkey);
    await utils.save(
      new models.instance.contract({
        name: "snekCoin0_0_1",
        owner: req.user.name,
        address: snekCoin001Depl.contractAddress,
        abi: JSON.stringify(abis.snekCoin0_0_1.abi),
        bytecode: abis.snekCoin0_0_1.bytecode,
      })
    );
    let dispatcherStorageDepl = await ethereum.deploy("dispatcherStorage", abis.dispatcherStorage, [snekCoin001Depl.contractAddress], owner.pubkey);
    await utils.save(
      new models.instance.contract({
        name: "dispatcherStorage",
        owner: req.user.name,
        address: dispatcherStorageDepl.contractAddress,
        abi: JSON.stringify(abis.dispatcherStorage.abi),
        bytecode: abis.dispatcherStorage.bytecode,
      })
    );
    abis.dispatcher.bytecode = abis.dispatcher.bytecode.replaceAll('1111222233334444555566667777888899990000', dispatcherStorageDepl.contractAddress.slice(2));
    let dispatcherDepl = await ethereum.deploy("dispatcher", abis.dispatcher, [], owner.pubkey);
    await utils.save(
      new models.instance.contract({
        name: "dispatcher",
        owner: req.user.name,
        address: dispatcherDepl.contractAddress,
        abi: JSON.stringify(abis.dispatcher.abi),
        bytecode: abis.dispatcher.bytecode,
      })
    );

    abis.snekCoinBack.bytecode = abis.snekCoinBack.bytecode.replaceAll('__LibInterface__________________________', dispatcherDepl.contractAddress.slice(2))
    let snekCoinBackDepl = await ethereum.deploy("snekCoinBack", abis.snekCoinBack, snekCoinArgs, owner.pubkey);
    await utils.save(
      new models.instance.contract({
        name: "snekCoinBack",
        owner: req.user.name,
        address: snekCoinBackDepl.contractAddress,
        abi: JSON.stringify(abis.snekCoinBack.abi),
        bytecode: abis.snekCoinBack.bytecode,
      })
    );

    let snekCoinTokenDepl = await ethereum.deploy("snekCoinToken", abis.snekCoinToken, [snekCoinBackDepl.contractAddress], owner.pubkey);
    await utils.save(
      new models.instance.contract({
        name: "snekCoinToken",
        owner: req.user.name,
        address: snekCoinTokenDepl.contractAddress,
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
        gas: 3000000,
        gasPrice: 20000000000,
      }
    );

    utils.ok200({setRootReceipt: receipt}, res);
  } catch (err) {
    next(err);
  }
}
