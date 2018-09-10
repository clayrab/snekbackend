// var path = require('path');
//var favicon = require('serve-favicon');
//var logger = require('morgan');
//var mongoose = require('mongoose');
// global.fetch = require("node-fetch");
var w3 = require('web3');
var express = require('express');
var fetch = require("node-fetch");
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser'); //required for passport
var jwt = require('jsonwebtoken');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;

var models = require('./model.js').models;
var rewardTokenABI = require('/Users/clay/projects/rewardCoin/truffle/build/contracts/RewardToken.json');
console.log(rewardTokenABI);
var app = express();
app.use(passport.initialize());
// Needed for passport local strategy
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));
//var web3 = new w3(w3.givenProvider || "ws://localhost:8546");
var web3 = new w3(w3.givenProvider || "ws://127.0.0.1:9545");

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
      console.log("user");
      console.log(user);
      // if (!user.validPassword(password)) {
      //   return done(null, false, { message: 'Incorrect password.' });
      // }
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
  console.log("jwt_payload");
  console.log(jwt_payload);
  console.warn(models);
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
      }
      if(info){
        res.type('application/json');
        res.status(200);
        res.send(info);
      }
      if(user){
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

//app.get('/sendTransaction', passport.authenticate('jwt', { session: false }),
app.get('/sendtransaction', async (req, res, next) => {
  try {
    console.log("sendtransaction");
    var account = web3.eth.accounts.privateKeyToAccount("0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3");
    web3.eth.accounts.wallet.add(account);
    //todo encrypt the wallet and create api

// var sampleContractABI = [{
//   “constant”:true,
//   ”inputs”:[],
//   ”name”:”name”,
//   ”outputs”:[
//     {
//       “name”:””,
//       ”type”:”string”}],
//       ”payable”:false,
//       ”stateMutability”:”view”,
//       ”type”:”function”
//     },{
//       “constant”:false,
//       ”inputs”:[{
//       “name”:”_name”,
//       ”type”:”string”
//     }],
//   ”name”:”set”,
//   ”outputs”:[],
//   ”payable”:false,
//   ”stateMutability”:”nonpayable”,
//   ”type”:”function”
//   },{
//       “constant”:true,
//       ”inputs”:[],
//       ”name”:”get”,
//       ”outputs”:[{“name”:””,”type”:”string”}],”payable”:false,”stateMutability”:”view”,”type”:”function”},{“anonymous”:false,”inputs”:[{“indexed”:false,”name”:”name”,”type”:”string”}],”name”:”LogSet”,”type”:”event”}];

    var contract1 = new web3.eth.Contract(rewardTokenABI);
    //var contract1 = new web3.eth.Contract(abi, address, {gasPrice: '12345678', from: fromAddress});

    var contract2 = contract1.clone();
    contract2.options.address = address2;

    (contract1.options.address !== contract2.options.address);

    //console.log(acct);
    console.log(web3.eth.accounts.wallet);
    //web3.eth.accounts.signTransaction(tx, privateKey [, callback]);
    web3.eth.accounts.signTransaction({
      to: '0xF0109fC8DF283027b6285cc889F5aA624EaC1F55',
      value: '1000000000',
      gas: 2000000,
      gasPrice: '234567897654321'
    }, '0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3')
    web3.eth.getBalance("0x627306090abab3a6e1400e9345bc60c78a8bef57", function(err, res) {
      console.log(res.toString(10)); // because you get a BigNumber

    });
    web3.eth.getBalance("0xF0109fC8DF283027b6285cc889F5aA624EaC1F55", function(err, res) {
      console.log(res.toString(10)); // because you get a BigNumber

    });


    //console.log(web3.eth.sendTransaction);
    web3.eth.sendTransaction({from: '0x627306090abab3a6e1400e9345bc60c78a8bef57', data: '0x432...'})
    .once('transactionHash', function(hash){
      console.log("transactionHash");
     })
    .once('receipt', function(receipt){
      console.log("receipt");
    })
    .on('confirmation', function(confNumber, receipt){
      console.log("confirmation");
    })
    .on('error', function(error){
      console.log("error");
    })
    .then(function(receipt){ // will be fired once the receipt is mined
      console.log("mined");
    });

  } catch (err) {
    next(err);
  }
});


app.get('/api/getnews', async (req, res, next) => {
  let items = null;
  try {
    const url = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Freactjsnews.com%2Ffeed.xml';
    await fetch(url)
    .then(response => response.json())
    .then((data) => {
      if (data.status === 'ok') {
        items = data.items;
      }
    }).catch((err) => {
      throw err;
    });
    //res.type(text/html); res.status(200); res.send(<p>HELLO WORLD!);
    res.type('application/json');
    res.status(200);
    res.send(items);
  } catch (err) {
    next(err);
  }
});

app.get('/makeUser', async (req, res, next) => {
  try {
    var john = new models.instance.user({
        name: "John",
        cardstats: {"three": 10}
    });
    var items = null;
    john.save(function(err){
      if(err) {
        console.log(err);
      } else {
        console.log("ok");
      }
      res.type('application/json');
      res.status(200);
      res.send(john);
    });
  } catch (err) {
    next(err);
  }
});

app.get('/getUser', async (req, res, next) => {
  try {
    models.instance.user.findOne({name: 'John'}, function(err, user){
      if(err) throw err;
      //The variable `john` is a model instance containing the person named `John`
      //`john` will be undefined if no person named `John` was found
      console.log('Found ', user.name);

      res.type('application/json');
      res.status(200);
      res.send(user);
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
  // res.render('error', {
  //   message: err.message,
  //   error: {}
  // });
});


app.listen(3001, () => console.log('Example app listening on port 3001!'))

module.exports = app;
