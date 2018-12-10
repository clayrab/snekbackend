const bcrypt = require('bcrypt');
const models = require('../model.js').models;
const config = require('./config.js');
const crypt = require('./crypt.js');
const keyCache = require('./keyCache.js');
const ethereum = require("./ethereum.js");
const web3 = require("./web3Instance.js").web3;

exports.ok200 = function(value, res) {
  res.type('application/json');
  res.status(200);
  res.send(value);
}
exports.error500 = function(error, res) {
  res.type('application/json');
  res.status(500);
  res.send(error);
}

exports.error401Unauthorized = function(res) {
  res.type('application/json');
  res.status(401);
  res.send("Unauthorized");
}

exports.save = async(model) => {
  return await new Promise((resolve, reject) => {
    model.save(function(err){
      if(err) {
        reject(err);
      } else {
        resolve();
      }
    });
  }).catch(err => {throw err});
}
exports.mustFind = async(model, keyMap) => {
  return await new Promise((resolve, reject) => {
    model.findOne(keyMap, {allow_filtering: true}, function (err, retObj) {
      if(err){
        reject(err);
      }
      if(!retObj){
        reject("Object not found in model: " + JSON.stringify(keyMap));
      }
      resolve(retObj);
    });
  }).catch(err => {throw err});
}

exports.mustNotFind = async(model, keyMap) => {
  return await new Promise((resolve, reject) => {
    model.findOne(keyMap, function (err, retObj) {
      if(err){
        reject(err);
      } else if(retObj){
        reject("Object already exists!");
      } else {
        resolve();
      }
    });
  }).catch(err => {throw err});
}

exports.configureOwnerCache = async() => {
  let user = await exports.mustFind(models.instance.user, {name: config.owner});
  let privKey = crypt.decrypt(user.keycrypt, config.owner + config.ownerSalt + config.aesSalt);
  let runtimeKeyCrypt  = crypt.encrypt(privKey, config.owner+"runtime" + config.ownerSalt + config.aesSalt);
  await keyCache.keyCacheSet(config.owner + "runtime", runtimeKeyCrypt);
  await keyCache.keyCacheSet(config.owner + "runtimepubkey", user.pubkey);
  console.log("****** config owner key cache success ******");
}
