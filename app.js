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
// const io = socketIo(server);
// server.listen(port, () => console.log(`socket open on port ${port}`));
// io.on("connection", (socket) => {
//
//   console.log("New client connected");
//   setInterval(() => {
//       emitSeconds(socket)
//     },
//     900
//   );
//   socket.on("disconnect", () => {
//     console.log("Client disconnected");
//   });
// });
module.exports = app;

app.disable('x-powered-by');
// https://expressjs.com/en/advanced/best-practice-security.html
app.use(passport.initialize());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());

//passport.use(auth.loginStrategy);
passport.use(auth.passwordStrategy);
passport.use('jwt', auth.jwtStrategy);

app.post('/createSnekToken', passport.authenticate('jwt', { session: false }), snekRoutes.createSnekTokenRoute);
app.post('/setRoot', snekRoutes.setRootRoute);
//app.post('/synchronizeEvents', passport.authenticate('jwt', { session: false }), snekRoutes.synchronizeEventsRoute);

app.post('/login', auth.loginRoute);

app.get('/getLastGas', snekRoutes.getLastGasRoute);
app.get('/getPrices', snekRoutes.getPricesRoute);
app.get('/getOwner', snekRoutes.getOwnerRoute);
app.get('/getLastBlock', snekRoutes.getLastBlockRoute);
app.get('/getSyncing', snekRoutes.getSyncyingRoute);
app.get('/getUser', passport.authenticate('jwt', { session: false }), snekRoutes.getUserRoute);
app.get('/getGames', passport.authenticate('jwt', { session: false }), snekRoutes.getGamesRoute);
app.get('/getTransactions', passport.authenticate('jwt', { session: false }), snekRoutes.getTransactionsRoute);

//app.get('/getBlock', passport.authenticate('jwt', { session: false }), snekRoutes.getBlockRoute);

// MineHauled+SNK+GAS
// GameHauled(“signed contract”)+ETH
// LevelUnlockedSNK(“Upgrade Mining Camp”)+SNK
// LevelUnlockedETH(“Upgrade Mining Camp”)+ETH
// PowerupsBought+ETH

//app.get('/checkCreds',  passport.authenticate('jwt', { session: false }), snekRoutes.checkCredsRoute )
app.post('/recordScore', passport.authenticate('jwt', { session: false }), snekRoutes.recordScoreRoute);

app.post('/createTransaction', passport.authenticate('jwt', { session: false }), snekRoutes.createTransactionRoute);
app.post('/buyPowerups', passport.authenticate('jwt', { session: false }), snekRoutes.buyPowerupsRoute);
app.post('/buyUpgradedMine', passport.authenticate('jwt', { session: false }), snekRoutes.buyUpgradedMineRoute);
app.post('/buySuperGame', passport.authenticate('jwt', { session: false }), snekRoutes.buySuperGameRoute);
app.post('/mine', passport.authenticate('jwt', { session: false }), snekRoutes.mineRoute);
app.post('/mineWithSnek', passport.authenticate('jwt', { session: false }), snekRoutes.mineWithSnekRoute);
app.post('/sendEth', passport.authenticate('jwt', { session: false }), snekRoutes.sendEthRoute);
app.post('/sendSnek', passport.authenticate('jwt', { session: false }), snekRoutes.sendSnekRoute);

app.post('/setPrice', passport.authenticate('jwt', { session: false }), snekRoutes.setPriceRoute);
app.post('/setAllPrices', passport.authenticate('jwt', { session: false }), snekRoutes.setAllPriceRoute);

app.post('/createLocalUser', auth.createLocalUserRoute);
app.post('/createLocalUserFromKey', auth.createLocalUserFromKeyRoute);
app.post('/changePassword', passport.authenticate('jwt', { session: false }), auth.changePasswordRoute);
app.post('/editProfile', passport.authenticate('jwt', { session: false }), auth.editProfileRoute);

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
server.on('listening', async () => {
  //console.log("listening")
});
server.listen(3001, async() => {
  //let validDB = utils.validateModel();
  //console.log("validdb: " + validDB);
  // if(!(await ethereum.paritySyncStatus())){
  //   throw "parity is not synched";
  // }
  let syncing = await ethereum.getSyncing();
  if(syncing){
    console.log("***** parity is not synched! *****")
    server.close(function () {
      console.log("***** Closed all connections ***** ");
      console.log("***** Exiting ***** ");
      process.exit(0);
      // Close db connections, etc.
    });
    setTimeout( function () {
      console.error("***** Could not close connections in time, forcefully shutting down!!! *****");
      process.exit(1);
    }, 5*1000);
  } else {
    console.log("****** parity OK ******")
    console.log("****** networkID: " + (await web3.eth.net.getId()) + " ******");
    console.log("****** checkRootBlock ******");
    await ethereum.checkRootBlock();
    console.log("****** synchronize ******");
    await ethereum.synchronize();
    console.log("****** subscribe ******");
    await ethereum.subscribe();
    console.log("****** configureOwnerCache ******");
    await ethereum.configureOwnerCache();
    //await ethereum.resyncAllPastEvents(); // use once if chainevent table is dropped or truncated.
    console.log('****** Listening on port 3001! ******');
  }
});
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  console.log('Closing http server.');
  server.close(() => {
    console.log('Http server closed.');
  });
});
