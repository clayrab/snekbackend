// NodeCache
// stdTTL: (default: 0) the standard ttl as number in seconds for every generated cache element. 0 = unlimited
// checkperiod: (default: 600) The period in seconds, as a number, used for the automatic delete check interval. 0 = no periodic check.
// errorOnMissing: (default: false) en/disable throwing or passing an error to the callback if attempting to .get a missing or expired value.
// useClones: (default: true) en/disable cloning of variables. If true you'll get a copy of the cached variable. If false you'll save and get just the reference. Note: true is recommended, because it'll behave like a server-based caching. You should set false if you want to save mutable objects or other complex types with mutability involved and wanted. Here's a simple code exmaple showing the different behavior
// deleteOnExpire: (default: true) whether variables will be deleted automatically when they expire. If true the variable will be deleted. If false the variable will remain. You are encouraged to handle the variable upon the event expired by yourself.

const NodeCache = require( "node-cache" );
const config = require("./config.js");

const keyCache = new NodeCache({
  stdTTL: config.jwtExpirationTime,
  checkperiod: 120,
  deleteOnExpire: true,
  useClones: true,
  errorOnMissing: false
});
exports.keyCache = keyCache;
exports.keyCacheSet = function(key, value, done) {
  keyCache.set(key, value, async( err, success ) => {
    if(err){
      throw "Error: " + err;
    } else if(!success){
      throw "Error storing key.";
    } else {
      done(value);
    }
  });
}
exports.keyCacheGet = function(key, done) {
  keyCache.get(key, function(err, value){
    if(err){
      throw "Error: " + err;
    } else if(!value){
      throw "Error finding key.";
    } else {
      done(value);
    }
  });
}

// obj = { my: "Special", variable: 42 };
// myCache.set( "myKey", obj, function( err, success ){
//   if( !err && success ){
//     console.log( success );
//     // true
//     // ... do something ...
//   }
// });