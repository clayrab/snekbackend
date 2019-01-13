const express = require('express');
const fetch = require("node-fetch");
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser'); //required for passport local strategy
const passport = require('passport');
const crypto = require('crypto');
const http = require('http');

const models = require('./model.js').models;
const auth = require("./auth.js");
const snekRoutes = require("./snekRoutes.js");
const config = require("./utils/config.js");
const ethereum = require("./utils/ethereum.js");
const utils = require("./utils/utils.js");
const crypt = require("./utils/crypt.js");
const snek = require("./utils/snek.js");
const keyCache = require("./utils/keyCache.js");
const web3 = require("./utils/web3Instance.js").web3;
const socketIo = require("socket.io");

let app = express();

let port = 3002;
const emitSeconds = async(socket) => {
  try {
    var date = new Date();
    socket.emit("FromAPI", date.getSeconds()); // Emitting a new message. It will be consumed by the client
  } catch (error) {
    console.error(`Error: ${error.code}`);
  }
};

const server = http.createServer(app);
const io = socketIo(server);

server.listen(port, () => console.log(`socket open on port ${port}`));

io.on("connection", (socket) => {

  console.log("New client connected");
  setInterval(() => {
      emitSeconds(socket)
    },
    900
  );
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});
module.exports = app;

app.disable('x-powered-by');
// https://expressjs.com/en/advanced/best-practice-security.html
app.use(passport.initialize());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

passport.use(auth.loginStrategy);
passport.use('jwt', auth.jwtStrategy);


app.post('/createSnekToken', passport.authenticate('jwt', { session: false }), snekRoutes.createSnekTokenRoute);
app.post('/setRoot', snekRoutes.setRootRoute);
//app.post('/synchronizeEvents', passport.authenticate('jwt', { session: false }), snekRoutes.synchronizeEventsRoute);

app.post('/login', auth.loginRoute);

app.get('/getLastGas', snekRoutes.getLastGasRoute);
app.get('/getPrices', snekRoutes.getPricesRoute);
app.get('/getOwner', snekRoutes.getOwnerRoute);
app.get('/getBlock', snekRoutes.getBlockRoute);
app.get('/getUser', passport.authenticate('jwt', { session: false }), snekRoutes.getUserRoute);
app.get('/getGames', passport.authenticate('jwt', { session: false }), snekRoutes.getGames);
app.get('/getBlock', passport.authenticate('jwt', { session: false }), snekRoutes.getBlockRoute);
app.get('/getBlock', passport.authenticate('jwt', { session: false }), snekRoutes.getBlockRoute);
app.get('/getBlock', passport.authenticate('jwt', { session: false }), snekRoutes.getBlockRoute);

// MineHauled+SNK+GAS
// GameHauled(“signed contract”)+ETH
// LevelUnlockedSNK(“Upgrade Mining Camp”)+SNK
// LevelUnlockedETH(“Upgrade Mining Camp”)+ETH
// PowerupsBought+ETH

//app.get('/checkCreds',  passport.authenticate('jwt', { session: false }), snekRoutes.checkCredsRoute )

app.post('/paySnek', passport.authenticate('jwt', { session: false }), snekRoutes.paySnekRoute);
app.post('/pay', passport.authenticate('jwt', { session: false }), snekRoutes.payRoute);
app.post('/mine', passport.authenticate('jwt', { session: false }), snekRoutes.mineRoute);
app.post('/recordScore', passport.authenticate('jwt', { session: false }), snekRoutes.recordScoreRoute);
app.post('/sendEth', passport.authenticate('jwt', { session: false }), snekRoutes.sendEthRoute);

app.post('/createLocalUser', auth.createLocalUserRoute);
app.post('/createLocalUserFromKey', auth.createLocalUserFromKeyRoute);


// app.post('/sendtokens',
//   passport.authenticate('jwt', { session: false }),
//   async(req, res) => {
//     var retData = {};
//     var contract = new web3.eth.Contract(rewardTokenABI.abi);
//     var receipt = await contract.methods.transfer(req.body.to, req.body.amount).send({from: req.user.pubkey});
//     retData.txHash = receipt.transactionHash;
//     utils.ok200(retData ,res);
//   }
// );

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('404 Not Found');
  err.status = 404;
  next(err);
});

// error handlers
app.use(function(err, req, res, next) {
  // TypeError: Cannot read property 'fromRed' of null
  // => password for decryption was wrong and privateKeyToAccount(privKey) is throwing this
  //
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
console.log("listen")
app.listen(3001, async() => {
  //let validDB = utils.validateModel();
  //console.log("validdb: " + validDB);
  if(!(await ethereum.paritySyncStatus())){
      throw "parity is not synched";
  }
  console.log("****** networkID: " + (await web3.eth.net.getId()) + " ******");
  await ethereum.checkRootBlock();
  await ethereum.synchronize();
  await ethereum.subscribe();
  await ethereum.configureOwnerCache();
  console.log('****** Listening on port 3001! ******');
});
