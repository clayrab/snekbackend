var express = require('express');
var fetch = require("node-fetch");
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser'); //required for passport local strategy
var passport = require('passport');
var crypto = require('crypto');
var models = require('./model.js').models;
var snekChainABI = require('./eth/abi/SnekCoinToken.json');
var web3 = require('web3');
var web3 = new web3(web3.givenProvider || "ws://127.0.0.1:9545");
var app = express();

var config = require("./config.js");
var auth = require("./auth.js");

app.disable('x-powered-by')
// https://expressjs.com/en/advanced/best-practice-security.html

app.use(passport.initialize());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

passport.use(auth.localStrategy);
passport.use('jwt', auth.jwtStrategy);
app.post('/login',
  auth.loginRoute
);
app.get('/secure',
  passport.authenticate('jwt', { session: false }),
  auth.secureNoopRoute
);

app.post('/createLocalUser',
  auth.createLocalUser
);

app.post('/sendtokens',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {
    var retData = {};
    var contract = new web3.eth.Contract(rewardTokenABI.abi);
    var receipt = await contract.methods.transfer(req.body.to, req.body.amount).send({from: req.user.pubkey});
    retData.txHash = receipt.transactionHash;
    res.type('application/json');
    res.status(200);
    res.send(retData);
  }
);

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

app.listen(3001, () => console.log('Listening on port 3001!'))
module.exports = app;
