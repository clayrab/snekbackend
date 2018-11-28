var LocalStrategy = require('passport-local').Strategy;
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var passport = require('passport');
var models = require('./model.js').models;
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var web3 = require('web3');
var web3 = new web3(web3.givenProvider || "ws://127.0.0.1:9545");
var config = require("./config.js");
var encryptor = require("./encryptor.js");
var keyCache = require("./keyCache.js");

exports.saltRounds = 10;
exports.createLocalUser = async (req, res, next) => {
  try {
    models.instance.user.findOne({name: req.body.username}, function (err, user) {
      if(user) {
        res.type('application/json');
        res.status(500);
        res.send("user already exists");
      } else {
        bcrypt.hash(req.body.pw, exports.saltRounds, function(err, storableHash) {
          var entropy = web3.utils.keccak256(req.body.username+req.body.pw+config.accountSalt);
          var acct = web3.eth.accounts.create(entropy);
          var keyCrypt = encryptor.encrypt(acct.privateKey, req.body.username+req.body.pw+config.aesSalt);

          // decrypt using password, reencrypt using runtime password, and store in runtime map

          var newuser = new models.instance.user({
              name: req.body.username,
              pwcrypt: storableHash,
              keycrypt: keyCrypt
          });
          var items = null;
          newuser.save(function(err){
            if(err) {
              res.type('application/json');
              res.status(500);
              res.send(err);
            } else {
              res.type('application/json');
              res.status(200);
              res.send(newuser);
            }
          });
        });
      }
    });
  } catch (err) {
    next(err);
  }
}
exports.loginRoute = function(req, res, next) {
  try {
    passport.authenticate('local', function(err, user, info) {
      if(err){
        res.type('application/json');
        res.status(200);
        res.send(err);
      } else if(info){
        res.type('application/json');
        res.status(200);
        res.send(info);
      } else if(user){
        var token = jwt.sign(user, jwtOptions.secretOrKey, {expiresIn: 86400 * 30});
        jwt.verify(token, jwtOptions.secretOrKey, function(err, data){
          console.log('err, data');
          console.log(err, data);
        });
        res.type('application/json');
        res.status(200);
        res.send({token: token});
      }
    })(req, res, next);
  } catch (err) {
    next(err);
  }
}

exports.secureNoopRoute = function(req, res) {
  //TODO add in try/catch
  // JWT AUTH PASSED. Stored username has been through login route.
  //
  res.send(req.user);
}

exports.localStrategy = new LocalStrategy(
  {
    usernameField: 'user',
    passwordField: 'pw',
  },
  function(username, password, done) {
    models.instance.user.findOne({ name: username }, function (err, user) {
      if (err) {
        return done(err);
      }
      // Also check that their encrypted key is in runtime store
      bcrypt.compare(password, user.pwcrypt, function(err, res) {
        // res == true
        if(res) {
          return done(null, {name: user.name});
          //return done(null, false, { message: 'Incorrect password.' });
        } else {
          return done(null, false, { message: 'Incorrect password.' });
        }
      });
    });
  }
);

var jwtOptions = {
  secretOrKey: config.jwtSalt,
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
};
//jwtOptions.secretOrKey = ;
//jwtOptions.;
exports.jwtStrategy = new JwtStrategy(jwtOptions, function(jwt_payload, done) {
  models.instance.user.findOne({
    name: jwt_payload.name
  }, function(err, user) {
    if (err) {
      return done(err, false);
    }
    if (user) {
      //done(null, {name: user.name, keycrypt: user.keycrypt});
      done(null, {name: user.name, keycrypt: user.keycrypt});
    } else {
      done(null, false);
    }
  });
});
