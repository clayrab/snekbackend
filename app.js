const express = require('express');
const fetch = require("node-fetch");
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser'); //required for passport local strategy
const passport = require('passport');
const crypto = require('crypto');

const models = require('./model.js').models;
const auth = require("./auth.js");
const snekRoutes = require("./snekRoutes.js");
const config = require("./utils/config.js");
const ethereum = require("./utils/ethereum.js");
const utils = require("./utils/utils.js");
const crypt = require("./utils/crypt.js");
const keyCache = require("./utils/keyCache.js");

let app = express();
app.disable('x-powered-by')
// https://expressjs.com/en/advanced/best-practice-security.html

app.use(passport.initialize());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

passport.use(auth.loginStrategy);
passport.use('jwt', auth.jwtStrategy);

app.post('/login', auth.loginRoute);

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

app.post('/createSnekToken',
  passport.authenticate('jwt', { session: false }),
  snekRoutes.createSnekTokenRoute
);

app.post('/mine',
  passport.authenticate('jwt', { session: false }),
  snekRoutes.mineRoute
);

app.post('/sendEth',
  passport.authenticate('jwt', { session: false }),
  snekRoutes.sendEthRoute
);

app.post('/getBalances',
  passport.authenticate('jwt', { session: false }),
  snekRoutes.getBalances
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
  console.log("*********************************** express error handler middleware ***********************************");
  console.log("*********************************** BEGIN ERROR ***********************************");
  console.log(err);
  console.log("*********************************** END ERROR ***********************************");
  res.status(err.status || 500);
  res.type('application/json');
  if(err.message){
    res.send({error: err.message});
  } else {
    res.send({error: err});
  }
});
app.on('listening', async () => {
    // server ready to accept connections here

});


app.listen(3001, async() => {
  console.log('Listening on port 3001!');
  console.log("****** config owner key cache ******");
  let randomSecret = await crypt.randomSecret();
  let user = await utils.mustFind(models.instance.user, {name: config.owner});
  let privKey = crypt.decrypt(user.keycrypt, config.owner+config.ownerSalt+config.aesSalt);
  let runtimeKeyCrypt  = crypt.encrypt(privKey, config.owner+config.ownerSalt+config.aesSalt);
  console.log(config.owner);
  console.log(config.ownerSalt);
  console.log(config.aesSalt);
  console.log(privKey);
  console.log(runtimeKeyCrypt);
  await keyCache.keyCacheSet(config.owner + "runtime", runtimeKeyCrypt);
});
module.exports = app;
