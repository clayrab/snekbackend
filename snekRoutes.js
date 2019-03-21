const models = require('./model.js').models;
const config = require("./utils/config.js");
const keyCache = require("./utils/keyCache.js");
const utils = require("./utils/utils.js");
const crypt = require("./utils/crypt.js");
const snek = require("./utils/snek.js");
const ethereum = require("./utils/ethereum.js");
const web3 = require("./utils/web3Instance.js").web3;
require("./utils/String.js");
let abis = {
  snekToken: require('./eth/abi/SnekCoinToken.json'),
  dispatcher: require('./eth/abi/Dispatcher.json'),
  dispatcherStorage: require('./eth/abi/DispatcherStorage.json'),
  snekCoinBack: require('./eth/abi/SnekCoinBack.json'),
  snekCoinToken: require('./eth/abi/SnekCoinToken.json'),
  snekCoin0_0_1: require('./eth/abi/SnekCoin0_0_1.json'),
}

// TransactionTypes: Buy PowerupsBoughtups(ETH), Buy Levels(ETH), Buy Levels(SNK), Mine mine(SNK+Gas), Mine Game(ETH)
exports.createTransactionRoute = async (req, res, next) => {
  console.log("createTransactionRoute");
  if(!req.body.type){
    utils.error500("Must provide type", res);
  } else if(!req.body.amount){
    utils.error500("Must provide amount", res);
  } else {
    let transactionKey = await crypt.randomSecret(32);
    let txData = {
      type: req.body.type,
      amount: req.body.amount
    };
    await keyCache.transactionsCacheSet(transactionKey, txData);
    utils.ok200({transactionKey: transactionKey, txdata: txData}, res);
  }
}
let saveUserAfterMining = async(dbUser, minedAmount) => {
  dbUser.mineUpgraded = false;
  dbUser.haul = dbUser.haul - minedAmount;
  dbUser.unredeemed = dbUser.unredeemed - minedAmount;
  // We don't want to do this, but the experience is a bit strange.
  // Keep it to test.
  //
  // if(dbUser.unredeemed > 0) {
  //   dbUser.haul = dbUser.unredeemed;
  //   if(dbUser.haul > dbUser.mineMax) {
  //     dbUser.haul = dbUser.mineMax;
  //   }
  // }
  await utils.save(dbUser);
  return dbUser;
}
exports.sendSnekRoute =  async (req, res, next) => {
  console.log("sendSnekRoute")
  console.log(req.body.to)
  try {
    let txdata = await validateTransactionForm(req, res);
    if(txdata){
      if(txdata.type == "SNK"){
        let amount = parseInt(txdata.amount, 10);
        if(amount == req.body.amount) {
          await savePurchase(req, txdata, amount);
          //let contract = await utils.mustFind(models.instance.contract,{name: "snekCoinToken"});
          let txhash = await snek.transferSnek(req.user, req.body.to, amount);
          let newtx = new models.instance.transaction({
            pubkey: req.user.pubkey,
            txhash: txhash,
            time: (new Date().toISOString()),
            type: "snk",
            from: req.user.pubkey,
            to: req.body.to,
            amount: models.datatypes.Long.fromNumber(amount),
            fee: null,
            pending: true,
          });
          await utils.save(newtx);
          utils.ok200({txhash: txhash}, res);
        } else if(txdata.amount > amount){
          utils.error500("Amount sent is too low.", res);
        } else {
          utils.error500("Amount sent is too high.", res);
        }
      } else {
        utils.error500("Powerups must be paid for with ETH.", res);
      }
    } else {
      utils.error500("Wrong coin type.", res);
    }
  } catch(err) {
    if((err + "").startsWith("Error finding txkey")){
      utils.error500("Error: Transaction not found.", res);
    } else if((err + "").startsWith("Error finding key")){
      utils.error500("Error: User not found. Please login again.", res);
    } else{
      next(err);
    }
  }
  //validate req.body.to
  try {

  } catch(err) {
    next(err);
  }
}
exports.sendEthRoute = async (req, res, next) => {
  //validate address
  console.log("sendethroute")
  console.log(req.body.to)
  try {
    let txdata = await validateTransactionForm(req, res);
    if(txdata){
      if(txdata.type == "ETH"){
        let amount = parseInt(txdata.amount, 10);
        if(amount == req.body.amount) {
          await savePurchase(req, txdata, amount);
          //let contract = await utils.mustFind(models.instance.contract,{name: "snekCoinToken"});
          let txhash = await ethereum.sendEth(req.user, req.body.to, amount, "onSent");
          let newtx = new models.instance.transaction({
            pubkey: req.user.pubkey,
            txhash: txhash,
            time: (new Date().toISOString()),
            type: "eth",
            from: req.user.pubkey,
            to: req.body.to,
            amount: models.datatypes.Long.fromNumber(amount),
            fee: null,
            pending: true,
          });
          await utils.save(newtx);
          utils.ok200({txhash: txhash}, res);
        } else if(txdata.amount > amount){
          utils.error500("Amount sent is too low.", res);
        } else {
          utils.error500("Amount sent is too high.", res);
        }
      } else {
        utils.error500("Powerups must be paid for with ETH.", res);
      }
    } else {
      utils.error500("Wrong coin type.", res);
    }
  } catch(err) {
    if((err + "").startsWith("Error finding txkey")){
      utils.error500("Error: Transaction not found.", res);
    } else if((err + "").startsWith("Error finding key")){
      utils.error500("Error: User not found. Please login again.", res);
    } else{
      next(err);
    }
  }
}
exports.mineWithSnekRoute = async (req, res, next) => {
  try {
    let txdata = await validateTransactionForm(req, res);
    if(txdata){
      if(txdata.type == "SNK"){
        let snekContract = await ethereum.getContract("snekCoinToken");
        let price = await snekContract.methods.getMiningSnekPrice().call();
        let sentPrice = parseInt(txdata.amount, 10);
        if(sentPrice == price) {
          await savePurchase(req, txdata, sentPrice);
          let usr = await utils.findOne(models.instance.user, {pubkey: req.user.pubkey});
          let minableAmount = usr.haul;
          let nonce = await snekContract.methods.getUserNonce(req.user.pubkey).call();
          let approvalSig = await ethereum.sign(nonce, minableAmount, req.user.pubkey);

          let method = snekContract.methods.mineWithSnek(approvalSig[0], approvalSig[1], approvalSig[2], approvalSig[3], price);
          let gasPrice = await web3.eth.getGasPrice();
          let options = {
            from: req.user.pubkey,
            gasPrice: gasPrice,
          };
          options.gas = (await ethereum.estimateGas(req.user, method, options)) + 10000;
          let ethBal = await ethereum.getBalance(req.user);
          if(options.gas * gasPrice > ethBal) {
            utils.error500("Not enough ethereum to pay for gas.", res);
          }

          let isFraud = false;
          if (isFraud) {
            utils.error500("Cannot approve mine", res);
          } else {
            usr = await saveUserAfterMining(usr, minableAmount);
            await clearTransaction(req);
            let txhash = await ethereum.sendContractCall(req.user, method, options, "onSent");
            let newtx = new models.instance.transaction({
              pubkey: req.user.pubkey,
              txhash: txhash,
              time: (new Date().toISOString()),
              type: "mineWithSnek",
              from: null,
              to: null,
              amount: models.datatypes.Long.fromNumber(minableAmount),
              fee: models.datatypes.Long.fromNumber(price),
              pending: true,
            });
            await utils.save(newtx);
            utils.ok200({txhash: txhash, user: usr,}, res);
          }
        } else if(sentPrice > price){
          utils.error500("Amount paid is too high.", res);
        } else {
          utils.error500("Amount paid is too low.", res);
        }
      } else {
        utils.error500("Upgrading Mine must be paid for with SNK.", res);
      }
    } else {
      utils.error500("Transaction data not found. Please create transaction again.", res);
    }
  } catch(err) {
    if((err + "").startsWith("Error finding txkey")){
      utils.error500("Error: Transaction not found.", res);
    } else if((err + "").startsWith("Error finding key")){
      utils.error500("Error: User not found. Please login again. \n" + err, res);
    } else{
      next(err);
    }
  }
}

exports.mineRoute = async (req, res, next) => {
  console.log("mineroute")
  try {
    let txdata = await validateTransactionForm(req, res);
    if(txdata){
      if(txdata.type == "ETH"){
        let snekContract = await ethereum.getContract("snekCoinToken");
        let price = await snekContract.methods.getMiningPrice().call();
        let sentPrice = parseInt(txdata.amount, 10);
        if(sentPrice == price) {
          await savePurchase(req, txdata, sentPrice);
          let usr = await utils.findOne(models.instance.user, {pubkey: req.user.pubkey});
          let minableAmount = usr.haul;
          let nonce = await snekContract.methods.getUserNonce(req.user.pubkey).call();
          let approvalSig = await ethereum.sign(nonce, minableAmount, req.user.pubkey);

          let method = snekContract.methods.mine(approvalSig[0], approvalSig[1], approvalSig[2], approvalSig[3]);
          let gasPrice = await web3.eth.getGasPrice();
          let options = {
            from: req.user.pubkey,
            gasPrice: gasPrice,
            value: price,
          };
          options.gas = (await ethereum.estimateGas(req.user, method, options)) + 10000;
          let ethBal = await ethereum.getBalance(req.user);
          if(price + (options.gas * gasPrice) > ethBal){
            utils.error500("Not enough ethereum to pay for fee and gas.", res);
          }

          let isFraud = false;
          if (isFraud) {
            utils.error500("Cannot approve mine", res);
          } else {
            usr = await saveUserAfterMining(usr, minableAmount);
            await clearTransaction(req);
            let txhash = await ethereum.sendContractCall(req.user, method, options, "onSent");
            let newtx = new models.instance.transaction({
              pubkey: req.user.pubkey,
              txhash: txhash,
              time: (new Date().toISOString()),
              type: "mine",
              from: null,
              to: null,
              amount: models.datatypes.Long.fromNumber(minableAmount),
              fee: models.datatypes.Long.fromNumber(price),
              pending: true,
            });
            await utils.save(newtx);
            let userData = await getUserDetails(req, usr);
            utils.ok200({txhash: txhash, user: userData,}, res);
          }
        } else if(sentPrice > price){
          utils.error500("Amount paid is too high.", res);
        } else {
          utils.error500("Amount paid is too low.", res);
        }
      } else {
        utils.error500("Upgrading Mine must be paid for with SNK.", res);
      }
    } else {
      utils.error500("Transaction data not found. Please create transaction again.", res);
    }
  } catch(err) {
    if((err + "").startsWith("Error finding txkey")){
      utils.error500("Error: Transaction not found.", res);
    } else if((err + "").startsWith("Error finding key")){
      utils.error500("Error: User not found. Please login again. \n" + err, res);
    } else{
      next(err);
    }
  }
}
let getPowerupsPriceTotal = async(req) => {
  let prices = await getPrices();
  let total = 0;
  if(req.body.slowdown) {
    let howMany = parseInt(req.body.slowdown, 10);
    total += howMany * prices.slowdown;
  }
  if(req.body.shed) {
    let howMany = parseInt(req.body.shed, 10);
    total += howMany * prices.shed;
  }
  if(req.body.supershed) {
    let howMany = parseInt(req.body.supershed, 10);
    total += howMany * prices.supershed;
  }
  if(req.body.ghost) {
    let howMany = parseInt(req.body.ghost, 10);
    total += howMany * prices.ghost;
  }
  if(req.body.pellettail) {
    let howMany = parseInt(req.body.pellettail, 10);
    total += howMany * prices.pellettail;
  }
  if(req.body.superpellets) {
    let howMany = parseInt(req.body.superpellets, 10);
    total += howMany * prices.superpellets;
  }
  return total;
}
let getUpgradedMinePrice = async(req) => {
  let price = await utils.find(models.instance.price, {name: "upgrademine"});
  if(price){
    return price.value;
  } else {
    return -1;
  }
}
let getSuperGamesPrice = async(req) => {
  console.log("getSuperGamesPrice")
  let prices = await getPrices();
  let total = 0;
  if(req.body.superScatter) {
    let howMany = parseInt(req.body.superScatter, 10);
    total += howMany * prices.superGame;
  }
  if(req.body.superBlock) {
    let howMany = parseInt(req.body.superBlock, 10);
    total += howMany * prices.superGame;
  }
  return total;
}

let givePowerup = async(req, userPowerups, name) =>{
  if(req.body[name]) {
    let howMany = parseInt(req.body[name], 10);
    if(userPowerups.powerups[name]) {
      howMany += userPowerups.powerups[name];
    }
    userPowerups.powerups[name] = howMany;
  }
}
let givePowerups = async(req) => {
  let userPowerups = await utils.findOne(models.instance.userpowerups, {pubkey: req.user.pubkey});
  if(!userPowerups){
    console.log("make new powerups")
    userPowerups = new models.instance.userpowerups({
      pubkey: req.user.pubkey,
      powerups: {},
    });
  }
  if(userPowerups.powerups == null) {
    userPowerups.powerups = {};
  }
  givePowerup(req, userPowerups, "slowdown");
  givePowerup(req, userPowerups, "shed");
  givePowerup(req, userPowerups, "supershed");
  givePowerup(req, userPowerups, "ghost");
  givePowerup(req, userPowerups, "pellettail");
  givePowerup(req, userPowerups, "superpellets");
  await utils.save(userPowerups);
  return userPowerups;
}
let giveUpgradedMine = async(req) => {
  return await new Promise(async(resolve, reject) => {
    try {
      utils.findOne(models.instance.user, {pubkey: req.user.pubkey}).then((user) => {
        if(user.mineUpgraded) {
          throw "mine is already upgraded";
        }
        user.mineUpgraded = true;
        utils.save(user).then(() => {
          resolve(user);
        }).catch(err => {
          reject(err);
        });
      }).catch(err => {
        reject(err);
      });
    } catch(err) {
      reject(err);
    }
  }).catch(err => {
    throw ""+err;
  });
}
let giveSuperGame = async(req) => {
  if(!req.body.superScatter && !req.body.superBlock){
    throw "must provide type of supergame: superScattor or superBlock";
  }
  let user = await utils.findOne(models.instance.user, {pubkey: req.user.pubkey});
  if(!user.purchasedGames) {
    user.purchasedGames = {};
  }
  if(req.body.superScatter) {
    let howMany = parseInt(req.body.superScatter, 10);
    if(user.purchasedGames.superScatter) {
      howMany += user.purchasedGames.superScatter;
    }
    user.purchasedGames.superScatter = howMany;
  }
  if(req.body.superBlock) {
    let howMany = parseInt(req.body.superBlock, 10);
    if(user.purchasedGames.superBlock) {
      howMany += user.purchasedGames.superBlock;
    }
    user.purchasedGames.superBlock = howMany;
  }
  await utils.save(user);
  return user;
}
let clearTransaction = async(req) => {
  await keyCache.transactionsCacheSet(req.body.txkey, null);
}
let validateTransactionForm = async(req) => {
  if(!req.body.txkey){
    throw "Must provide txkey";
  }
  if(!req.body.type){
    throw "Must provide type";
  }
  if(!req.body.amount){
    throw "Must provide amount";
  }
  let txdata = await keyCache.transactionsCacheGet(req.body.txkey);
  if(!txdata || !txdata.type || !txdata.amount) {
    throw "Transaction not found.";
  } else {
    if(req.body.type != txdata.type) {
      throw "Transaction type does not match request.";
    } else if (req.body.amount != txdata.amount ) {
      throw "Transaction amount does not match request.";
    } else {
      if(txdata.type == "SNK") {
        let snekBal = await snek.getBalance(req.user);
        let sentPrice = parseInt(txdata.amount, 10);
        if(sentPrice > snekBal){
          throw "Not enough snake in balance: " + snekBal;
        }
      } else if(txdata.type == "ETH") {
        let ethBal = await ethereum.getBalance(req.user);
        let sentPrice = parseInt(txdata.amount, 10);
        if(sentPrice > ethBal){
          throw "Not enough ETH in balance: " + ethBal;
        }
      } else {
        throw "Transaction must be type SNK or ETH.";
      }
      return txdata;
    }
  }
  return null; // Should be unreachable
}
let savePurchase = async(req, txdata, price) => {
  await utils.save(
    new models.instance.purchase({
      username: req.user.name,
      type: txdata.type,
      value: models.datatypes.Long.fromNumber(price),
      details: JSON.stringify(req.body),
    })
  );
}

exports.buyUpgradedMineRoute = async (req, res, next) => {
  try {
    let txdata = await validateTransactionForm(req, res);
    if(txdata){
      if(txdata.type == "SNK"){
        let price = await getUpgradedMinePrice(req);
        let sentPrice = parseInt(txdata.amount, 10);
        if(sentPrice == price) {
          await savePurchase(req, txdata, sentPrice);
          let contract = await utils.mustFind(models.instance.contract, {name: "snekCoinToken"});
          await ethereum.sendEth(req.user, contract.address, txdata.amount, "onSent");
          await clearTransaction(req);
          let user = await giveUpgradedMine(req);
          utils.ok200({user: user}, res);
        } else if(sentPrice> price){
          utils.error500("Amount paid is too high.", res);
        } else {
          utils.error500("Amount paid is too low.", res);
        }
      } else {
        utils.error500("Upgrading Mine must be paid for with SNK.", res);
      }
    } else {
      utils.error500("Unknown error processing transaction request.", res);
    }
  } catch(err) {
    if((err + "").startsWith("Error finding txkey")){
      utils.error500("Error: Transaction not found.", res);
    } else if((err + "").startsWith("Error finding key")){
      utils.error500("Error: User not found. Please login again. \n" + err, res);
    } else{
      next(err);
    }
  }
}

exports.buySuperGameRoute = async (req, res, next) => {
  try {
    let txdata = await validateTransactionForm(req, res);
    if(txdata){
      if(txdata.type == "ETH"){
        let price = await getSuperGamesPrice(req);
        let sentPrice = parseInt(txdata.amount, 10);
        if(sentPrice == price) {
          await savePurchase(req, txdata, sentPrice);
          let contract = await utils.mustFind(models.instance.contract, {name: "snekCoinToken"});
          await ethereum.sendEth(req.user, contract.address, txdata.amount, "onSent");
          await clearTransaction(req);
          let user = await giveSuperGame(req);
          utils.ok200({user: user}, res);
        } else if(txdata.amount > price){
          utils.error500("Amount paid is too high.", res);
        } else {
          utils.error500("Amount paid is too low.", res);
        }
      } else {
        utils.error500("Super Game must be paid for with ETH.", res);
      }
    } else {
      utils.error500("Unknown error processing transaction request.", res);
    }
  } catch(err) {
    if((err + "").startsWith("Error finding txkey")){
      utils.error500("Error: Transaction not found.", res);
    } else if((err + "").startsWith("Error finding key")){
      utils.error500("Error: User not found. Please login again.", res);
    } else{
      next(err);
    }
  }
}

exports.buyPowerupsRoute = async (req, res, next) => {
  try {
    let txdata = await validateTransactionForm(req, res);
    if(txdata){
      if(txdata.type == "ETH"){
        let price = await getPowerupsPriceTotal(req);
        let sentPrice = parseInt(txdata.amount, 10);
        if(sentPrice == price) {
          await savePurchase(req, txdata, sentPrice);
          let contract = await utils.mustFind(models.instance.contract,{name: "snekCoinToken"});
          await ethereum.sendEth(req.user, contract.address, txdata.amount, "onSent");
          await clearTransaction(req);
          let powerups = await givePowerups(req);
          utils.ok200({powerups: powerups}, res);
        } else if(txdata.amount > price){
          utils.error500("Amount paid is too high.", res);
        } else {
          utils.error500("Amount paid is too low.", res);
        }
      } else {
        utils.error500("Powerups must be paid for with ETH.", res);
      }
    } else {
      utils.error500("Unknown error processing transaction request.", res);
    }
  } catch(err) {
    if((err + "").startsWith("Error finding txkey")){
      utils.error500("Error: Transaction not found.", res);
    } else if((err + "").startsWith("Error finding key")){
      utils.error500("Error: User not found. Please login again.", res);
    } else{
      next(err);
    }
  }
}
exports.recordScoreRoute = async (req, res, next) => {
  console.log("recordScoreRoute")
  try {
    if(!req.body.howmany == null && typeof(req.body.howmany) == "number") {
      throw "Must provide howmany";
    }
    if(!req.body.level == null && typeof(req.body.level) == "number") {
      throw "Must provide level";
    }
    let howMany = parseInt(req.body.howmany, 10);
    let level = parseInt(req.body.level, 10);
    //let usermap = await utils.mustFind(models.instance.usermap,{name: req.user.name});
    let user = await utils.mustFind(models.instance.user, {pubkey: req.user.pubkey});
    // if(user.haul >= user.mineMax) {
    //   throw "Cannot haul any more";
    // }
    if(howMany > config.gameMax || howMany < 0) {
      //throw "Score must be between 0 and " + config.gameMax;
      howMany = config.gameMax;
    }
    user.unredeemed = user.unredeemed + howMany;
    user.totalWinnings = user.totalWinnings + howMany;
    user.gamecount = user.gamecount + 1;
    if(user.haul + howMany > user.mineMax) {
      howMany = user.mineMax - user.haul;
    }
    user.haul = user.haul + howMany;
    //          haul          : "int",
    //          gamecount     : "int",
    //          totalhaul     : "int",
    //          totalWinnings : "int",
    //          avgPerGame    : "double",
    await utils.save(user);
    let timestamp = new Date().toISOString();
    let newGame = new models.instance.game({
      pubkey: user.pubkey,
      time: timestamp,
      level: level,
      score: howMany,
    });
    await utils.save(newGame);
    utils.ok200({status : "OK", score: howMany, user: (await getUserDetails(req, user))}, res);
  } catch(err) {
    next(err);
  }
}

exports.getSyncyingRoute = async (req, res, next) => {
  let sync = await ethereum.getSyncing();
  utils.ok200({sync: sync, }, res);
}
exports.getLastGasRoute = async (req, res, next) => {
  let lastBlock = await web3.eth.getBlock('latest');
  utils.ok200({gasLimit: lastBlock.gasLimit}, res);
}
exports.getLastBlockRoute = async (req, res, next) => {
  let lastBlock = await web3.eth.getBlock('latest');
  utils.ok200({lastBlock: lastBlock}, res);
}
let setPrice = async(name, value) => {
  let bigintValue = models.datatypes.Long.fromNumber(value);
  let price = await utils.find(models.instance.price, {name: name});
  if(price){
    price.value = bigintValue;
  } else {
    price = new models.instance.price({
      name: name,
      value: bigintValue,
    });
  }
  await utils.save(price);
  return price;
}
let setOnchainPrice = async(name, value) => {
  let snekContract = await ethereum.getContract("snekCoinToken");
  let method = null;
  if(name == "haulmine") {
    method = snekContract.methods.changeMiningSnekPrice(value);
  } else if(name == "haulgame") {
    method = snekContract.methods.changeMiningPrice(value);
  } else {
    throw "only haulgame and haulmine prices are stored onchain"
  }
  let gasPrice = await web3.eth.getGasPrice();
  let pubkey = await keyCache.keyCacheGet(config.owner + "runtimepubkey");
  let options = {
    from: pubkey,
    gasPrice: gasPrice,
  };
  let runtimeOwner = {
    name: config.owner + "runtime",
    randomSecret: config.ownerSalt,
  };
  let gasEst = await ethereum.estimateGas(runtimeOwner, method, options);
  options.gas = gasEst + 10000;
  let receipt = await ethereum.sendContractCall(runtimeOwner, method, options, "onMined");
  return receipt;
}
let getPrice = async(name) => {
  let price = await utils.find(models.instance.price, {name: "powerup"});
  if(price){
    return price.value;
  } else {
    return -1;
  }
}
exports.setAllPriceRoute = async (req, res, next) => {
  if(req.user.name != config.owner) {
    throw "only owner can set prices";
  }
  let weiPerEth = 1000000000000000000;
  let gigaWei = 1000000000; // 1 GWei
  let miningGasCost = 2746693; // approximate gas used to mine snek
  let approxGasPrice = 5; //  Gas price early 2018 is ~8 Gwei
  // Assume snek will be worth approximately the amount of gas needed to mine it
  let pelletValue = miningGasCost * approxGasPrice * gigaWei/1000;
  await setPrice("slowdown", 5*pelletValue);
  await setPrice("shed", 5*pelletValue);
  await setPrice("supershed", 5*pelletValue);
  await setPrice("ghost", 5*pelletValue);
  await setPrice("pellettail", 5*pelletValue);
  await setPrice("superpellets", 5*pelletValue);
  await setPrice("upgrademine", 200); //SNK
  await setPrice("supergame", weiPerEth/100);
  await setOnchainPrice("haulgame", weiPerEth/1000);
  await setOnchainPrice("haulmine", 300); //SNK
  utils.ok200({status: "OK"}, res);
}
exports.setPriceRoute = async (req, res, next) => {
  if(req.user.name != config.owner) {
    throw "only owner can set prices";
  }
  if(!req.body.name || !req.body.value){
    throw "must supply name and value";
  }
  let name = req.body.name;
  let value = parseInt(req.body.value, 10);
  if(name == "haulmine" || name == "haulgame") {
    setOnchainPrice(name, value);
  } else {
    setPrice(name, value);
  }
  utils.ok200({status: "OK"}, res);
}
let getPrices = async() => {
  let prices = {};
  let snekContract = await ethereum.getContract("snekCoinToken");
  prices.mineGamePrice = await snekContract.methods.getMiningPrice().call();
  prices.mineHaulPrice = await snekContract.methods.getMiningSnekPrice().call();
  prices.slowdown = (await utils.find(models.instance.price, {name: "slowdown"})).value;
  prices.shed = (await utils.find(models.instance.price, {name: "shed"})).value;
  prices.supershed = (await utils.find(models.instance.price, {name: "supershed"})).value;
  prices.ghost = (await utils.find(models.instance.price, {name: "ghost"})).value;
  prices.pellettail = (await utils.find(models.instance.price, {name: "pellettail"})).value;
  prices.superpellets = (await utils.find(models.instance.price, {name: "superpellets"})).value;
  // prices.lvlsnkPrice = (await utils.find(models.instance.price, {name: "lvlsnk"})).value;
  // prices.lvlethPrice = (await utils.find(models.instance.price, {name: "lvleth"})).value;
  prices.upgradeMine = (await utils.find(models.instance.price, {name: "upgrademine"})).value;
  prices.superGame = (await utils.find(models.instance.price, {name: "supergame"})).value;
  prices.gasPrice = await web3.eth.getGasPrice();
  return prices;
}
exports.getPricesRoute = async (req, res, next) => {
  let prices = await getPrices();
  utils.ok200({prices: prices}, res);
}

exports.getOwnerRoute = async (req, res, next) => {
  let snekContract = ethereum.getContract("snekCoinToken");
  let owner = await snekContract.getOwner(req.user);
  let snekBal = await snekContract.getTotalSupply();
  let root = await snekContract.getRoot();
  let sender = await snekContract.getSender();
  keyCache.keyCacheGet(config.owner + "runtimepubkey").then((value) =>{
    utils.ok200({sender: sender, root: root, configowner: value, owner: owner}, res);
  });
}

exports.setRootRoute = async (req, res, next) => {
  let receipt = await snek.setRoot();
  utils.ok200({receipt: receipt}, res);
}

exports.getGamesRoute = async(req, res, next) => {
  console.log("getGames *********")
  //0x627306090abaB3A6e1400e9345bC60c78a8BEf57
  //let user = await utils.find(models.instance.game,{pubkey: req.user.pubkey});
  let games = await utils.findAll(models.instance.game, {pubkey: req.user.pubkey, $limit: 50, });
  utils.ok200({games: games}, res);
}
exports.getTransactionsRoute  = async(req, res, next) => {
  let transactions = await utils.findAll(models.instance.transaction, {pubkey: req.user.pubkey});
  utils.ok200({transactions: transactions}, res);
}
let getUserDetails = async(req, dbUser) => {
  console.log("getUserDetails")
  try {
    let snekContract = await ethereum.getContract("snekCoinToken");
    let snekBal = await snek.getBalance(req.user);
    let ethBal = await ethereum.getBalance(req.user);
    let transactions = await utils.findAll(models.instance.transaction, {pubkey: req.user.pubkey, });
    let data = {
      eth: ethBal,
      snek: snekBal,
      pubkey: dbUser.pubkey,
      name: dbUser.name,
      unredeemed: dbUser.unredeemed,
      mineMax: dbUser.mineMax,
      haul: dbUser.haul,
      gamecount: dbUser.gamecount,
      totalWinnings: dbUser.totalWinnings,
      mineUpgraded: dbUser.mineUpgraded,
      transactions: transactions,
    };
    return data;
  } catch(err) {
    throw err;
  }
}
exports.getUserRoute = async (req, res, next) => {
  console.log("getUserRoute")
  try {
    let user = await utils.mustFind(models.instance.user, {pubkey: req.user.pubkey});
    let balances = await getUserDetails(req, user);
    utils.ok200(balances, res);
  } catch(err) {
    next(err);
  }
}

exports.createSnekTokenRoute = async(req, res, next) => {
  // TODO validate
  // TODO Needs to be broken into 5 separate APIs like getOrDeploy()
  if(!req.body.name || !req.body.decimals || !req.body.totalSupply){
    throw "must supply name, decimals, and totalSupply";
  }
  // validate is owner
  if(req.user.name != config.owner) {
    throw "only owner can deploy contracts";
  }
  try {
    let owner = await utils.mustFind(models.instance.user, {pubkey: req.user.pubkey});
    let nonce = await web3.eth.getTransactionCount(owner.pubkey);
    let snekCoin0_0_1 = await utils.find(models.instance.contract, {name: "snekCoin0_0_1"});
    let snekCoin0_0_1Address = null;
    if(snekCoin0_0_1){
      snekCoin0_0_1Address = snekCoin0_0_1.address;
    } else {
      let snekCoin0_0_1Receipt = await ethereum.deployRaw("snekCoin0_0_1", abis.snekCoin0_0_1, [], nonce);
      nonce = nonce + 1;
      //let snekCoin0_0_1Receipt = await web3.eth.getTransactionReceipt(snekCoin0_0_1Txhash);
      await utils.save(
        new models.instance.contract({
          name: "snekCoin0_0_1",
          owner: req.user.name,
          address: snekCoin0_0_1Receipt.contractAddress,
          abi: JSON.stringify(abis.snekCoin0_0_1.abi),
          bytecode: abis.snekCoin0_0_1.bytecode,
        })
      );
      snekCoin0_0_1Address = snekCoin0_0_1Receipt.contractAddress;
    }
    console.log("snekCoin0_0_1Address: " + snekCoin0_0_1Address);
    let dispatcherStorage = await utils.find(models.instance.contract, {name: "dispatcherStorage"});
    let dispatcherStorageAddress = null;
    if(dispatcherStorage){
      dispatcherStorageAddress = dispatcherStorage.address;
    } else {
      console.log("deploying dispatcherStorage");
      let dispatcherStorageReceipt = await ethereum.deployRaw("dispatcherStorage", abis.dispatcherStorage, [snekCoin0_0_1Address], nonce);
      nonce = nonce + 1;
      //let dispatcherStorageReceipt = await web3.eth.getTransactionReceipt(dispatcherStorageTxhash);
      console.log("deployed dispatcherStorage: " + dispatcherStorageReceipt);
      console.log("deployed dispatcherStorage receipt: " + dispatcherStorageReceipt.contractAddress);
      await utils.save(
        new models.instance.contract({
          name: "dispatcherStorage",
          owner: req.user.name,
          address: dispatcherStorageReceipt.contractAddress,
          abi: JSON.stringify(abis.dispatcherStorage.abi),
          bytecode: abis.dispatcherStorage.bytecode,
        })
      );
      dispatcherStorageAddress = dispatcherStorageReceipt.contractAddress;
    }
    let dispatcher = await utils.find(models.instance.contract, {name: "dispatcher"});
    let dispatcherAddress = null;
    if(dispatcher){
      dispatcherAddress = dispatcher.address;
    } else {
      console.log("deploying dispatcher");
      abis.dispatcher.bytecode = abis.dispatcher.bytecode.replaceAll('1111222233334444555566667777888899990000', dispatcherStorageAddress.slice(2));
      let dispatcherReceipt = await ethereum.deployRaw("dispatcher", abis.dispatcher, [], nonce);
      nonce = nonce + 1;
      //let dispatcherReceipt = await web3.eth.getTransactionReceipt(dispatcherTxhash);
      await utils.save(
        new models.instance.contract({
          name: "dispatcher",
          owner: req.user.name,
          address: dispatcherReceipt.contractAddress,
          abi: JSON.stringify(abis.dispatcher.abi),
          bytecode: abis.dispatcher.bytecode,
        })
      );
      dispatcherAddress = dispatcherReceipt.contractAddress;
    }

    let snekCoinBack = await utils.find(models.instance.contract, {name: "snekCoinBack"});
    let snekCoinBackAddress = null;
    if(snekCoinBack){
      snekCoinBackAddress = snekCoinBack.address;
    } else {
      console.log("deploying snekCoinBack");
      abis.snekCoinBack.bytecode = abis.snekCoinBack.bytecode.replaceAll('__LibInterface__________________________', dispatcherAddress.slice(2))
      let snekCoinArgs = [web3.utils.asciiToHex(req.body.name), req.body.decimals, req.body.totalSupply];
      let snekCoinBackReceipt = await ethereum.deployRaw("snekCoinBack", abis.snekCoinBack, snekCoinArgs, nonce);
      nonce = nonce + 1;
      //let snekCoinBackReceipt = await web3.eth.getTransactionReceipt(snekCoinBackTxhash);
      await utils.save(
        new models.instance.contract({
          name: "snekCoinBack",
          owner: req.user.name,
          address: snekCoinBackReceipt.contractAddress,
          abi: JSON.stringify(abis.snekCoinBack.abi),
          bytecode: abis.snekCoinBack.bytecode,
        })
      );
      snekCoinBackAddress = snekCoinBackReceipt.contractAddress;
    }

    let snekCoinToken = await utils.find(models.instance.contract, {name: "snekCoinToken"});
    if(!snekCoinToken){
      console.log("deploying snekCoinToken");
      let snekCoinTokenReceipt = await ethereum.deployRaw("snekCoinToken", abis.snekCoinToken, [snekCoinBackAddress], nonce);
      nonce = nonce + 1;
      //let snekCoinTokenReceipt = await web3.eth.getTransactionReceipt(snekCoinTokenTxhash);
      await utils.save(
        ng.contract({
          name: "snekCoinToken",
          owner: req.user.name,
          address: snekCoinTokenReceipt.contractAddress,
          abi: JSON.stringify(abis.snekCoinToken.abi),
          bytecode: abis.snekCoinToken.bytecode,
        })
      );
    }
    console.log("all deployed");
    let snekContract = await ethereum.getContract("snekCoinToken");
    let snekBackContract = await ethereum.getContract("snekCoinBack");
    let pubkey = await keyCache.keyCacheGet(config.owner + "runtimepubkey");
    let runtimeOwner = {
      name: config.owner + "runtime",
      randomSecret: config.ownerSalt,
    };
    console.log("setting Root")
    let receipt = await ethereum.sendContractCall(
      runtimeOwner,
      snekBackContract.methods.setRoot(snekContract.options.address),
      {
        from: pubkey,
        gas: 150000,
        gasPrice: 20000000000,
      }
    );
    utils.ok200({setRootReceipt: receipt}, res);
  } catch (err) {
    next(err);
  }
}
