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

exports.freeMineRoute = async (req, res, next) => {
  try {
    if(!req.body.howmany){
      throw "Must provide howmany";
    }
    let snekContract = ethereum.getContract("SnekCoinToken");
    snek.approveMine(req.user, req.body.howmany);
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
    console.log("mineroote");

    await snek.approveMine(req.user, req.body.howmany);
    // TODO: fraud
    //console.log(snekContract);
    // let receipt = await ethereum.sendContractCall(
    //   req.user,
    //   snekContract.methods.mine(req.body.howmany),
    //    {
    //     from: req.user.pubkey,
    //     gas: 3000000,
    //     gasPrice: 20000000000,
    //     value: 30000,
    //   }
    //);
    utils.ok200({status: "OK"}, res);
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
    console.log("getbalances");
    console.log(req.user);
    // let snekContract = await ethereum.getContract("snekCoinToken");
    // console.log(snekContract);
    let snekBal = await snek.getTotalSupply();
    let ethBal = await ethereum.getBalance(req.user);
    let user = await utils.mustFind(models.instance.user, {name: req.user.name});
    let unredeemedBal = user.unredeemed;
    let balances = {
      eth: ethBal,
      snek: 10,
      unredeemed: unredeemedBal,
    };
    utils.ok200(balances, res);
  } catch(err) {
    next(err);
  }
  // let ethBal = await ethereum.getBalance(req.user);
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
    //acct[0] = "0x627306090abab3a6e1400e9345bc60c78a8bef57"
    let snekCoinArgs = [web3.utils.asciiToHex(req.body.name), req.body.decimals, req.body.totalSupply];
    let snekCoin001Depl = await ethereum.deploy("snekCoin0_0_1", abis.snekCoin0_0_1, [], "0x627306090abab3a6e1400e9345bc60c78a8bef57");
    await utils.save(
      new models.instance.contract({
        name: "snekCoin0_0_1",
        owner: req.user.name,
        address: snekCoin001Depl.contractAddress,
        abi: JSON.stringify(abis.snekCoin0_0_1.abi),
        bytecode: abis.snekCoin0_0_1.bytecode,
      })
    );
    let dispatcherStorageDepl = await ethereum.deploy("dispatcherStorage", abis.dispatcherStorage, [snekCoin001Depl.contractAddress], "0x627306090abab3a6e1400e9345bc60c78a8bef57");
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
    let dispatcherDepl = await ethereum.deploy("dispatcher", abis.dispatcher, [], "0x627306090abab3a6e1400e9345bc60c78a8bef57");
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
    let snekCoinBackDepl = await ethereum.deploy("snekCoinBack", abis.snekCoinBack, snekCoinArgs, "0x627306090abab3a6e1400e9345bc60c78a8bef57");
    await utils.save(
      new models.instance.contract({
        name: "snekCoinBack",
        owner: req.user.name,
        address: snekCoinBackDepl.contractAddress,
        abi: JSON.stringify(abis.snekCoinBack.abi),
        bytecode: abis.snekCoinBack.bytecode,
      })
    );

    let snekCoinTokenDepl = await ethereum.deploy("snekCoinToken", abis.snekCoinToken, [snekCoinBackDepl.contractAddress], "0x627306090abab3a6e1400e9345bc60c78a8bef57");
    await utils.save(
      new models.instance.contract({
        name: "snekCoinToken",
        owner: req.user.name,
        address: snekCoinTokenDepl.contractAddress,
        abi: JSON.stringify(abis.snekCoinToken.abi),
        bytecode: abis.snekCoinToken.bytecode,
      })
    );

    let snekCoinBackContract = new web3.eth.Contract(abis.snekCoinBack.abi, snekCoinBackDepl.address);
    snekCoinBackContract.methods.setRoot(snekCoinBackDepl.address);
    utils.ok200({status: "done"}, res);
  } catch (err) {
    console.log("here?");
    console.log(err);
    next(err);
  }
}
