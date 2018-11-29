const models = require('./model.js').models;
const config = require("./config.js");
const keyCache = require("./keyCache.js");
const utils = require("./utils.js");
const encryptor = require("./encryptor.js");
const web3 = require("./web3Instance.js").web3;

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
    let privKey = encryptor.decrypt(value, req.user.name+req.user.randomSecret+config.aesSalt);
    let acct = web3.eth.accounts.privateKeyToAccount(privKey);
    utils.ok200(privKey, res);
  } catch(err) {
    next(err);
  }
}

exports.mine = async (req, res, next) => {
  try {
    let value = await keyCache.keyCacheGet(req.user.name);
    let privKey = encryptor.decrypt(value, req.user.name+req.user.randomSecret+config.aesSalt);
    let acct = web3.eth.accounts.privateKeyToAccount(privKey);
    utils.ok200(privKey, res);
  }
  catch(err) {
    next(err);
  }
}
