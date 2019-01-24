const NodeCache = require( "node-cache" );
const config = require("./config.js");
// --NodeCache--
// stdTTL:          (default: 0) the standard ttl as number in seconds for every generated cache element. 0 = unlimited
// checkperiod:     (default: 600) The period in seconds, as a number, used for the automatic delete check interval. 0 = no periodic check.
// errorOnMissing:  (default: false) en/disable throwing or passing an error to the callback if attempting to .get a missing or expired value.
// useClones:       (default: true) en/disable cloning of variables. If true you'll get a copy of the cached variable. If false you'll save and get
//    just the reference. Note: true is recommended, because it'll behave like a server-based caching. You should set false if you want to save
//    mutable objects or other complex types with mutability involved and wanted. Here's a simple code exmaple showing the different behavior
// deleteOnExpire:  (default: true) whether variables will be deleted automatically when they expire. If true the variable will be deleted. If
//    false the variable will remain. You are encouraged to handle the variable upon the event expired by yourself.
//
// -- transaction cache--
// transactionCache is used to store unique objects which will be saved and cleared after use
// to support atomic actions(e.g. payment, mining, etc.)
// TransactionTypes: Buy Powerups(ETH), Buy Levels(ETH), Buy Levels(SNK), Mine mine(SNK+Gas), Mine Game(ETH)

// MineHauled+SNK+GAS
// GameHauled(“signed contract”)+ETH
// LevelUnlockedSNK(“Upgrade Mining Camp”)+SNK
// LevelUnlockedETH(“Upgrade Mining Camp”)+ETH
// PowerupsBought+ETH

const transactionTTL = 120;
const transactionsCache = new NodeCache({
  stdTTL: transactionTTL,
  checkperiod: transactionTTL + 10,
  deleteOnExpire: true,
  useClones: true,
  errorOnMissing: false,
});
exports.transactionsCacheSet = async(key, value) => {
  return await new Promise((resolve, reject) => {
    transactionsCache.set(key, value, async( err, success ) => {
      if(err){
        reject(err);
      } else if(!success){
        reject("Error storing key.");
      } else {
        resolve(value);
      }
    });
  }).catch(err => {throw err});
}
exports.transactionsCacheGet = async(key) => {
  return await new Promise((resolve, reject) => {
    transactionsCache.get(key, function(err, value){
      if(err){
        reject("Error: " + err);
      } else if(!value){
        reject("Error finding txkey: " + key);
      } else {
        resolve(value);
      }
    });
  }).catch(err => {throw err});
}
const keyCache = new NodeCache({
  stdTTL: config.jwtExpirationTime,
  checkperiod: 600,
  deleteOnExpire: true,
  useClones: true,
  errorOnMissing: false,
});
//exports.keyCache = keyCache;
exports.keyCacheSet = async(key, value) => {
  return await new Promise((resolve, reject) => {
    keyCache.set(key, value, async( err, success ) => {
      if(err){
        reject(err);
      } else if(!success){
        reject("Error storing key.");
      } else {
        resolve(value);
      }
    });
  }).catch(err => {throw err});
}
exports.keyCacheGet = async(key) => {
  return await new Promise((resolve, reject) => {
    keyCache.get(key, function(err, value){
      if(err){
        reject("Error: " + err);
      } else if(!value){
        reject("Error finding key: " + key);
      } else {
        resolve(value);
      }
    });
  }).catch(err => {throw err});
}

// myCache.keys( function( err, mykeys ){
//   if( !err ){
//     console.log( mykeys );
//    // [ "all", "my", "keys", "foo", "bar" ]
//   }
// });
//
exports.getPrivKey = async(name, password) => {
  return await new Promise((resolve, reject) => {
    try {
      let privKey = crypt.decrypt(value, name+password+config.aesSalt);
      resolve(privKey);
    } catch(err) {
      reject(err);
    }
  }).catch(err => {throw err});
}
// obj = { my: "Special", variable: 42 };
// myCache.set( "myKey", obj, function( err, success ){
//   if( !err && success ){
//     console.log( success );
//     // true
//     // ... do something ...
//   }
// });
