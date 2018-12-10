const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const models = require('./model.js').models;
const utils = require("./utils/utils.js");
const config = require("./utils/config.js");
const crypt = require("./utils/crypt.js");
const keyCache = require("./utils/keyCache.js");

const web3 = require("./utils/web3Instance.js").web3;

exports.saltRounds = 10;
exports.createLocalUserRoute = async (req, res, next) => {
  // validate req.body.pw req.body.username
  try {
    await utils.mustNotFind(models.instance.user, {name: req.body.username});
    let storableHash = await crypt.bcryptHash(req.body.pw, exports.saltRounds);
    let entropy = web3.utils.keccak256(req.body.username+req.body.pw+config.accountSalt);
    let acct = web3.eth.accounts.create(entropy);
    //let storableKeyCrypt = crypt.encrypt(acct.privateKey, req.body.username+req.body.pw+config.aesSalt);
    let storableKeyCrypt = crypt.encrypt(acct.privateKey, req.body.username+req.body.pw+config.aesSalt);
    if(req.body.name == config.owner) {
      storableKeyCrypt = crypt.encrypt(acct.privateKey, req.body.username+config.ownerSalt+config.aesSalt);
    }
    let newuser = new models.instance.user({
        name: req.body.username,
        pubkey: acct.address,
        pwcrypt: storableHash,
        keycrypt: storableKeyCrypt,
        unredeemed: 0,
        approved: 0,
        mineMax: 1000,
        haul: 0,
    });
    await utils.save(newuser);
    utils.ok200(newuser, res);
  } catch (err) {
    next(err);
  }
}

exports.createLocalUserFromKeyRoute = async (req, res, next) => {
  // validate req.body.pw req.body.username req.body.key
  // key should start with "0x"
  try {
    await utils.mustNotFind(models.instance.user,{name: req.body.username});
    let storableHash = await crypt.bcryptHash(req.body.pw, exports.saltRounds);
    let storableKeyCrypt = crypt.encrypt(req.body.key, req.body.username+req.body.pw+config.aesSalt);
    let acct = web3.eth.accounts.privateKeyToAccount(req.body.key);
    if(req.body.name != config.owner) {
      // owner key must be accessible to entire app
      storableKeyCrypt = crypt.encrypt(acct.privateKey, req.body.username+config.ownerSalt+config.aesSalt);
    }
    let newuser = new models.instance.user({
        name: req.body.username,
        pubkey: acct.address,
        pwcrypt: storableHash,
        keycrypt: storableKeyCrypt,
        unredeemed: 0,
        approved: 0,
        mineMax: 1000,
        haul: 0,
    });
    await utils.save(newuser);
    if(req.body.name != config.owner) {
      // useful for development, configureOwnerCache also fires on startup
      await utils.configureOwnerCache();
    }
    utils.ok200(newuser, res);
  } catch (err) {
    next(err);
  }
}
exports.loginRoute = function(req, res, next) {
  try {
    passport.authenticate(
      'local',
      function(err, user, info) {
        if(err){
          next(err);
        } else if(info){
          next("error. info: " + info);
        } else if(user){
          let token = jwt.sign(user, config.jwtSalt, {expiresIn: config.jwtExpirationTime});
          jwt.verify(token, config.jwtSalt, function(err, data){
            utils.ok200({token: token}, res);
          });
        }
      }
    )(req, res, next);
  } catch (err) {
    next(err);
  }
}

exports.loginStrategy = new LocalStrategy(
  {
    usernameField: 'user',
    passwordField: 'pw',
  },
  async(username, password, done) => {
    try {
      let user = await utils.mustFind(models.instance.user, {name: username});
      let res = await crypt.bcryptCompare(password, user.pwcrypt);
      if(!res) {
        done("did not pass", false, {message: 'Incorrect password.'});
      } else {
        let privKey = crypt.decrypt(user.keycrypt, username+password+config.aesSalt);
        if(username == config.owner) {
          // owner key must be accessible to entire app
          privKey = crypt.decrypt(user.keycrypt, username+config.ownerSalt+config.aesSalt);
        }
        let randomSecret = await crypt.randomSecret();
        let runtimeKeyCrypt = crypt.encrypt(privKey, username+randomSecret+config.aesSalt);
        await keyCache.keyCacheSet(username, runtimeKeyCrypt);
        //done(null, {name: user.name, pubkey: user.pubkey, randomSecret: randomSecret});
        // TODO FIX ME. remove password!!!!
        done(null, {name: user.name, password: password, pubkey: user.pubkey, randomSecret: randomSecret});
      }
    } catch(err) {
      return done(err);
    }
  }
);

exports.jwtStrategy = new JwtStrategy({
    secretOrKey: config.jwtSalt,
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
  },
  async(jwt_payload, done) => {
    let user = await utils.mustFind(models.instance.user, {name: jwt_payload.name});
    user.randomSecret = jwt_payload.randomSecret;
    // if(jwt_payload.password) {
    //   //let user = await utils.mustFind(models.instance.user, {name: user.name});
    //   let privKey = crypt.decrypt(user.keycrypt, user.name+jwt_payload.password+config.aesSalt);
    //   if(user.name != config.owner) {
    //     privKey = crypt.decrypt(user.keycrypt, user.name+config.ownerSalt+config.aesSalt);
    //   }
    //   let randomSecret = await crypt.randomSecret();
    //   let devRuntimeKeyCrypt = crypt.encrypt(privKey, user.name+user.randomSecret+config.aesSalt);
    //   await keyCache.keyCacheSet(user.name+"dev", devRuntimeKeyCrypt);
    //   //await keyCache.keyCacheSet(username, runtimeKeyCrypt);
    // }
    done(null, user);
    //done(null, {name: user.name, pubkey: jwt_payload.pubkey, randomSecret: jwt_payload.randomSecret});
  }
);
