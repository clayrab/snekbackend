const express = require('express');
const fetch = require("node-fetch");
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser'); //required for passport local strategy
const passport = require('passport');
const crypto = require('crypto');
const models = require('./model.js').models;
const snekChainABI = require('./eth/abi/SnekCoinToken.json');


const config = require("./config.js");
const auth = require("./auth.js");
const snekRoutes = require("./snekRoutes.js");

let app = express();
app.disable('x-powered-by')
// https://expressjs.com/en/advanced/best-practice-security.html

app.use(passport.initialize());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

passport.use(auth.loginStrategy);
passport.use('jwt', auth.jwtStrategy);
app.post('/login',
  auth.loginRoute
);

app.post('/createLocalUser',
  auth.createLocalUserRoute
);

app.post('/createLocalUserFromKey',
  auth.createLocalUserFromKeyRoute
);

app.post('/rewardPreTokens',
  passport.authenticate('jwt', { session: false }),
  snekRoutes.rewardPreTokensRoute
);

app.post('/sendtokens',
  passport.authenticate('jwt', { session: false }),
  async(req, res) => {
    var retData = {};
    var contract = new web3.eth.Contract(rewardTokenABI.abi);
    var receipt = await contract.methods.transfer(req.body.to, req.body.amount).send({from: req.user.pubkey});
    retData.txHash = receipt.transactionHash;
    utils.ok200(retData ,res);
  }
);

app.get('/getusers', async (req, res, next) => {
  try {
    var query = {
      $limit: 10
    }
    models.instance.user.find(query, {raw: true}, function(err, users){
      if(err) throw err;
      utils.ok200(users, res);
    });
  } catch (err) {
    next(err);
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('404 Not Found');
  err.status = 404;
  next(err);
});

// error handlers
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.type('application/json');
  res.send({error: err});
});

app.listen(3001, () => console.log('Listening on port 3001!'))
module.exports = app;
