const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const passport = require('passport');
const models = require('./model.js').models;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require("./config.js");
const encryptor = require("./encryptor.js");
const keyCache = require("./keyCache.js");
const web3 = require("./web3Instance.js").web3;
const utils = require("./utils.js");

exports.saltRounds = 10;
exports.createLocalUserRoute = async (req, res, next) => {
  try {
    utils.mustNotFind(models.instance.user,{name: req.body.username}, function () {
      bcrypt.hash(req.body.pw, exports.saltRounds, function(err, storableHash) {
        let entropy = web3.utils.keccak256(req.body.username+req.body.pw+config.accountSalt);
        let acct = web3.eth.accounts.create(entropy);
        let storableKeyCrypt = encryptor.encrypt(acct.privateKey, req.body.username+req.body.pw+config.aesSalt);
        let newuser = new models.instance.user({
            name: req.body.username,
            pubkey: acct.address,
            pwcrypt: storableHash,
            keycrypt: storableKeyCrypt,
            unredeemed: 0,
            mineMax: 1000,
            haul: 0,
        });
        utils.save(newuser, function(){
          utils.ok200(newuser, res);
        });
      });
    });
  } catch (err) {
    next(err);
  }
}

exports.createLocalUserFromKeyRoute = async (req, res, next) => {
  try {
    utils.mustNotFind(models.instance.user,{name: req.body.username}, function () {
      let storableKeyCrypt = encryptor.encrypt(req.body.key, req.body.username+req.body.pw+config.aesSalt);
      // decrypt using password, reencrypt using runtime password, and store in runtime map
      let newuser = new models.instance.user({
          name: req.body.username,
          pubkey: acct.address,
          pwcrypt: storableHash,
          keycrypt: storableKeyCrypt,
          unredeemed: 0,
          mineMax: 1000,
          haul: 0,
      });
      utils.save(newuser, () => {
        utils.ok200(newuser, res);
      });
    });
  } catch (err) {
    next(err);
  }
}

exports.loginRoute = function(req, res, next) {
  try {
    passport.authenticate('local', function(err, user, info) {
      if(err){
        throw err;
      } else if(info){
        throw "error. info: " + info;
      } else if(user){
        let token = jwt.sign(user, config.jwtSalt, {expiresIn: config.jwtExpirationTime});
        jwt.verify(token, config.jwtSalt, function(err, data){
          utils.ok200({token: token}, res);
        });
      }
    })(req, res, next);
  } catch (err) {
    next(err);
  }
}

exports.loginStrategy = new LocalStrategy(
  {
    usernameField: 'user',
    passwordField: 'pw',
  },
  function(username, password, done) {
    try {
      utils.mustFind(models.instance.user, {name: username }, function (user) {
        bcrypt.compare(password, user.pwcrypt, function(err, res) {
          if(!res) {
            return done(null, false, {message: 'Incorrect password.'});
          } else {
            encryptor.randomSecret((randomSecret) => {
              let privKey = encryptor.decrypt(user.keycrypt, username+password+config.aesSalt);
              let runtimeKeyCrypt = encryptor.encrypt(privKey, username+randomSecret+config.aesSalt);
              keyCache.keyCacheSet(username, runtimeKeyCrypt, async() => {
                return done(null, {name: user.name, randomSecret: randomSecret});
              });
            });
          }
        });
      });
    } catch(err) {
      return done(err);
    }
  }
);

exports.jwtStrategy = new JwtStrategy({
    secretOrKey: config.jwtSalt,
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
  },
  function(jwt_payload, done) {
    utils.mustFind(models.instance.user, {name: jwt_payload.name}, function(user){
      done(null, {name: user.name, randomSecret: jwt_payload.randomSecret});
    });
  }
);
