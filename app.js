// var path = require('path');
// var favicon = require('serve-favicon');
// var logger = require('morgan');
// var mongoose = require('mongoose');
var web3 = require('web3');
var express = require('express');
var fetch = require("node-fetch");
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser'); //required for passport
var jwt = require('jsonwebtoken');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var HDKey = require('hdkey');
var crypto = require('crypto');

var models = require('./model.js').models;
// var rewardTokenABI = require('./eth/abi/RewardToken.json');
// var dgtTokenABI = require('./eth/abi/DGT.json');
// var dgtSubTokenABI = require('./eth/abi/DGTSubToken.json');
 var snekChainABI = require('./eth/abi/SnekCoinToken.json');

var web3 = new web3(web3.givenProvider || "ws://127.0.0.1:9545");
var app = express();

app.use(passport.initialize());
// Needed for passport local strategy
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));

passport.use(new LocalStrategy({
    usernameField: 'user',
    passwordField: 'pw'
  },
  function(username, password, done) {
    models.instance.user.findOne({ name: username }, function (err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if(password != "asdf") {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

var jwtOptions = {}
//TODO: move this externally and change it
jwtOptions.secretOrKey = '7x0jhxt"9(thpX6'
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('JWT');
passport.use('jwt', new JwtStrategy(jwtOptions, function(jwt_payload, done) {
  models.instance.user.findOne({
    name: jwt_payload.name
  }, function(err, user) {
    if (err) {
      return done(err, false);
    }
    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  })
}))

app.post('/login', function(req, res, next) {
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
        var payload = {name: user.name};
        var token = jwt.sign(payload, jwtOptions.secretOrKey, {expiresIn: 86400 * 30});
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
});

app.get('/secure', passport.authenticate('jwt', { session: false }),
  function(req, res) {
    //TODO add in try/catch
    res.send(req.user);
  }
);

app.post('/sendtokens', passport.authenticate('jwt', { session: false }), async(req, res) => {
  var retData = {};
  var contract = new web3.eth.Contract(rewardTokenABI.abi);
  var receipt = await contract.methods.transfer(req.body.to, req.body.amount).send({from: req.user.pubkey});
  retData.txHash = receipt.transactionHash;
  res.type('application/json');
  res.status(200);
  res.send(retData);
})
app.post('/createuser', async (req, res, next) => {
  // TODO: finish this function
  console.log(req.body.username);
  console.log(req.body.pubkey);
  console.log(req.body.privkey);
  console.log(req.body.vin);
  try {
    var newuser = new models.instance.user({
        name: req.body.username,
        privkey : req.body.privkey,
        pubkey: req.body.pubkey,
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
  } catch (err) {
    next(err);
  }
});

app.get('/getusers', async (req, res, next) => {
  try {
    var query = {
      $limit: 10
    }
    models.instance.user.find(query, {raw: true}, function(err, users){
      if(err) throw err;
      res.type('application/json');
      res.status(200);
      res.send(users);
    });
  } catch (err) {
    next(err);
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.type('application/json');
  res.send({error: err.message});
});


app.listen(3001, () => console.log('Example app listening on port 3001!'))

module.exports = app;
