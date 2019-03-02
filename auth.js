const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const passport = require('passport');
const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');

const models = require('./model.js').models;
const utils = require("./utils/utils.js");
const ethereum = require("./utils/ethereum.js");
const config = require("./utils/config.js");
const crypt = require("./utils/crypt.js");
const keyCache = require("./utils/keyCache.js");

const web3 = require("./utils/web3Instance.js").web3;

exports.saltRounds = 10;

exports.changePasswordRoute = async (req, res, next) => {
  try {
    if(!req.body.user || !req.body.pw || !req.body.newpw){
      throw "must supply user, pw, and newpw";
    }
    passport.authenticate(
      'local',
      async(err, user, info) => {
        if(err){
          next(err);
        } else if(info){
          console.log("error");
          console.log(info);
          throw info;
          // con
          // next("error. info: " + info);

        } else if(user){
          console.log("successful auth for user: " + user);
          console.log("info: " + info);
          console.log(user.name);
          console.log(user.pubkey);
          //console.log(user.randomSecret);
          console.log(req.user.randomSecret);
          let acct = await ethereum.makeAcctFromCache(req.user.name, req.user.randomSecret);
          let storableHash = await crypt.bcryptHash(req.body.newpw, exports.saltRounds);
          let storableKeyCrypt = crypt.encrypt(acct.privateKey, req.body.user+req.body.newpw+config.aesSalt);
          if(req.body.user === config.owner) {
            console.log("owner changing pw...")
            storableKeyCrypt = crypt.encrypt(acct.privateKey, req.body.user+config.ownerSalt+config.aesSalt);
          }
          let dbUser = await utils.findOne(models.instance.user, {pubkey: req.user.pubkey});
          dbUser.pwcrypt = storableHash;
          dbUser.keycrypt = storableKeyCrypt;
          await utils.save(dbUser);
          req.body.pw = req.body.newpw;
          exports.loginRoute(req, res, next);
        }
      }
    )(req, res, next);
  } catch (err) {
    next(err);
  }


}
exports.editProfileRoute = async (req, res, next) => {
  utils.ok200({status: "OK"}, res);
}

exports.createLocalUserRoute = async (req, res, next) => {
  // validate req.body.pw req.body.username
  if(!req.body.username || !req.body.pw){
    throw "must supply username and pw";
  }
  try {
    // let usermapCheck = await utils.find(models.instance.usermap, {name: req.body.username});
    // if(usermapCheck) {
    //   throw "usermap already exists";
    // }

    let storableHash = await crypt.bcryptHash(req.body.pw, exports.saltRounds);
    let entropy = web3.utils.keccak256(req.body.username+req.body.pw+config.accountSalt);
    let acct = web3.eth.accounts.create(entropy);
    await utils.mustNotFind(models.instance.user, {pubkey: acct.address});
    //await utils.mustNotFind(models.instance.user, {pubkey: acct.pubkey});
    //let storableKeyCrypt = crypt.encrypt(acct.privateKey, req.body.username+req.body.pw+config.aesSalt);
    let storableKeyCrypt = crypt.encrypt(acct.privateKey, req.body.username+req.body.pw+config.aesSalt);
    if(req.body.username === config.owner) {
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
      gamecount: 0,
      totalhaul: 0,
    });
    await utils.save(newuser);
    let usermap = new models.instance.usermap({
      pubkey: acct.address,
      name: req.body.username,
    });
    await utils.save(usermap);
    // let userchainevents = new models.instance.userchainevents({
    //     userpubkey: acct.address,
    //     chainevents: [],
    // });
    // await utils.save(userchainevents);
    utils.ok200(newuser, res);
  } catch (err) {
    next(err);
  }
}

exports.createLocalUserFromKeyRoute = async (req, res, next) => {
  // validate req.body.pw req.body.username req.body.key
  // key should start with "0x" and have length
  if(!req.body.username || !req.body.pw || !req.body.key){
    throw "must supply username, pw, and key";
  }
  try {
    //await utils.mustNotFind(models.instance.user,{name: req.body.username});
    let storableHash = await crypt.bcryptHash(req.body.pw, exports.saltRounds);
    let storableKeyCrypt = crypt.encrypt(req.body.key, req.body.username+req.body.pw+config.aesSalt);
    let acct = web3.eth.accounts.privateKeyToAccount(req.body.key);
    if(req.body.username === config.owner) {
      // owner key must be accessible to entire app
      storableKeyCrypt = crypt.encrypt(acct.privateKey, req.body.username+config.ownerSalt+config.aesSalt);
    }
    await utils.mustNotFind(models.instance.user, {pubkey: acct.address});
    let newuser = new models.instance.user({
      name: req.body.username,
      pubkey: acct.address,
      pwcrypt: storableHash,
      keycrypt: storableKeyCrypt,
      unredeemed: 0,
      approved: 0,
      mineMax: 1000,
      haul: 0,
      gamecount: 0,
      totalhaul: 0,
    });
    await utils.save(newuser);
    let usermap = new models.instance.usermap({
      pubkey: acct.address,
      name: req.body.username,
    });
    await utils.save(usermap);
    // let userchainevents = new models.instance.userchainevents({
    //     userpubkey: acct.address,
    //     chainevents: [],
    // });
    // await utils.save(userchainevents);
    if(req.body.username === config.owner) {
      // useful for development, configureOwnerCache also fires on startup
      await ethereum.configureOwnerCache();
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
      async(err, user, info) => {
        if(err){
          next(err);
        } else if(info){
          next("error. info: " + info);
        } else if(user){
          let privKey = crypt.decrypt(user.keycrypt, user.name+req.body.pw+config.aesSalt);
          if(user.name === config.owner) {
            console.log("here?")
            // owner key must be accessible to entire app, so it is encrypted differently
            console.log(privKey);
            privKey = crypt.decrypt(user.keycrypt, user.name+config.ownerSalt+config.aesSalt);
            console.log(privKey);
          }
          console.log("login")
          console.log(user.name)
          console.log(config.owner)
          console.log(user.name === config.owner)
          console.log(privKey);
          let randomSecret = await crypt.randomSecret();
          console.log("login randomSecret: " + randomSecret);
          let runtimeKeyCrypt = crypt.encrypt(privKey, user.name+randomSecret+config.aesSalt);
          console.log("Logged in! Setting key cache for user: " + user.name)
          await keyCache.keyCacheSet(user.name, runtimeKeyCrypt);

          let payload = {name: user.name, pubkey: user.pubkey, randomSecret: randomSecret};
          let token = JWT.sign(payload, config.jwtSalt, {expiresIn: config.jwtExpirationTime});
          JWT.verify(token, config.jwtSalt, function(err, data){
            utils.ok200({token: token}, res);
          });
        }
      }
    )(req, res, next);
  } catch (err) {
    next(err);
  }
}
//
// exports.loginStrategy = new LocalStrategy(
//   {
//     usernameField: 'user',
//     passwordField: 'pw',
//   },
//   async(username, password, done) => {
//     try {
//       let usermap = await utils.mustFind(models.instance.usermap, {name: username});
//       let user = await utils.mustFind(models.instance.user, {pubkey: usermap.pubkey});
//       let res = await crypt.bcryptCompare(password, user.pwcrypt);
//       if(!res) {
//         done("did not pass", false, {message: 'Incorrect password.'});
//       } else {
//         let privKey = crypt.decrypt(user.keycrypt, username+password+config.aesSalt);
//         if(username == config.owner) {
//           // owner key must be accessible to entire app, so it is encrypted differently
//           privKey = crypt.decrypt(user.keycrypt, username+config.ownerSalt+config.aesSalt);
//         }
//         let randomSecret = await crypt.randomSecret();
//         let runtimeKeyCrypt = crypt.encrypt(privKey, username+randomSecret+config.aesSalt);
//         console.log("Logged in! Setting key cache for user: " + username)
//         await keyCache.keyCacheSet(username, runtimeKeyCrypt);
//         done(null, {name: user.name, pubkey: user.pubkey, randomSecret: randomSecret});
//       }
//     } catch(err) {
//       return done(err);
//     }
//   }
// );
exports.passwordStrategy = new LocalStrategy(
  {
    usernameField: 'user',
    passwordField: 'pw',
  },
  async(username, password, done) => {
    try {
      let usermap = await utils.mustFind(models.instance.usermap, {name: username});
      let user = await utils.mustFind(models.instance.user, {pubkey: usermap.pubkey});
      let res = await crypt.bcryptCompare(password, user.pwcrypt);
      if(!res) {
        done("did not pass", false, {message: 'Incorrect password.'});
      } else {
        done(null, user);
        //done(null, {name: user.name, pubkey: user.pubkey, randomSecret: randomSecret});
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
    let user = await utils.mustFind(models.instance.user, {pubkey: jwt_payload.pubkey});
    //user.randomSecret = jwt_payload.randomSecret;
    //done(null, user);
    done(null, {name: user.name, pubkey: jwt_payload.pubkey, randomSecret: jwt_payload.randomSecret});
  }
);
