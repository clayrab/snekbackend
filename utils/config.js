// Set the current environment to true in the env object
var currentEnv = 'dev';
process.argv.forEach(function (val, index, array) {
  if(val.startsWith("env=")) {
    currentEnv = val.split("=")[1];
  }
});
console.log("config")
console.log(currentEnv)
exports.envs = { prod: 0, qa: 1, dev: 2 };
if(currentEnv != "prod" && currentEnv != "qa" && currentEnv != "dev") {
  throw "env must be prod, qa, or dev";
}
exports.currentEnv = currentEnv;
exports.owner = "clayrab";
exports.jwtExpirationTime = 172800; //2*24*60*60;
exports.chaidId = 3; // EIP 155. Needs to be 1 for mainnet, 3 for ropsten.
exports.gameMax = 1000;
exports.rootBlockNumber = 0;
exports.network = "dev";
if(currentEnv == "qa") {
  exports.network = "ropsten";
  exports.rootBlockNumber = 4688783;
  exports.chaidId = 3; // EIP 155. Needs to be 1 for mainnet, 3 for ropsten.
} else if(currentEnv == "qa") {
  exports.network = "mainnet";
  exports.rootBlockNumber = 6967018; // Dec 28 2018
  exports.chaidId = 1; // EIP 155. Needs to be 1 for mainnet, 3 for ropsten.
}




//exports.rootBlockNumber = 0;
var accountSalt = "NonProdSalt";
var aesSalt = "NonProdAesSalt";
var jwtSalt = "NonProdJwtSalt";
var ownerSalt = "NonProdOwnerSalt";
if(currentEnv == "production"){
  accountSalt = process.env.SNAKE_BCRYPT_SALT;
  aesSalt = process.env.SNAKE_AES_SALT;
  jwtSalt = process.env.SNAKE_JWT_SALT;
  ownerSalt = process.env.SNAKE_OWN_SALT;
}
if(currentEnv == "production" && bcryptSalt.length < 20) { // make sure a salt was configured in sh env
   throw new Error("INVALID SALT PROVIDED");
}
if(currentEnv == "production" && aesSalt.length < 20) { // make sure a salt was configured in sh env
   throw new Error("INVALID AES ENTROPY PROVIDED");
}
if(currentEnv == "production" && jwtSalt.length < 20) { // make sure a salt was configured in sh env
   throw new Error("INVALID JWT ENTROPY PROVIDED");
}
if(currentEnv == "production" && ownerSalt.length < 20) { // make sure a salt was configured in sh env
   throw new Error("INVALID JWT ENTROPY PROVIDED");
}
exports.bcryptSalt = accountSalt;
exports.aesSalt = aesSalt;
exports.jwtSalt = jwtSalt;
exports.ownerSalt = ownerSalt;
// exports.log = {
//   path: __dirname + "/var/log/app_#{currentEnv}.log"
// };
// exports.server = {
//   port: 9600,
//   // In staging and production, listen loopback. nginx listens on the network.
//   ip: '127.0.0.1'
// };
// if (currentEnv != 'production' && currentEnv != 'staging') {
//   exports.enableTests = true;
//   // Listen on all IPs in dev/test (for testing from other machines)
//   exports.server.ip = '0.0.0.0';
// };
// exports.db {
//   URL: "mongodb://localhost:27017/#{exports.appName.toLowerCase()}_#{currentEnv}"
// };
