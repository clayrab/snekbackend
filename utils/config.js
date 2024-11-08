// Set the current environment to true in the env object
var currentEnv = 'dev';
process.argv.forEach(function (val, index, array) {
  if(val.startsWith("env=")) {
    currentEnv = val.split("=")[1];
  }
});
if(currentEnv != "prod" && currentEnv != "qa" && currentEnv != "dev") {
  throw "env must be prod, qa, or dev";
}
console.log("currentEnv: " + currentEnv);
exports.currentEnv = currentEnv;
exports.owner = "clayrab";
exports.jwtExpirationTime = 2*24*60*60; // If this is changed, be sure to change the frontend also.
exports.chainId = 3; // EIP 155. Needs to be 1 for mainnet, 3 for ropsten.
exports.gameMax = 1000;
exports.rootBlockNumber = 4796000;
exports.network = "dev";
exports.googleOauthClientIDiOS = "384585138051-rbt6p2o3a6pfc2ied769ogcgebcnap7d.apps.googleusercontent.com";
if(currentEnv == "qa") {
  exports.network = "ropsten";
  //exports.rootBlockNumber = 4764546;
  exports.rootBlockNumber = 5079756;
  exports.chainId = 3; // EIP 155. Needs to be 1 for mainnet, 3 for ropsten.
} else if(currentEnv == "prod") {
  exports.network = "mainnet";
  exports.rootBlockNumber = 6967018; // Dec 28 2018
  exports.chainId = 1; // EIP 155. Needs to be 1 for mainnet, 3 for ropsten.
}
var accountSalt = "NonProdSalt";
var aesSalt = "NonProdAesSalt";
var jwtSalt = "NonProdJwtSalt";
var ownerSalt = "NonProdOwnerSalt";
if(currentEnv == "qa") {
  // This is just here to jwts from QA won't work on dev(can hide bugs)
  // TODO: READ THESE FROM process.env on QA also!!!
  accountSalt = "NonProdSaltQA";
  aesSalt = "NonProdAesSaltQA";
  jwtSalt = "NonProdJwtSaltQA";
  ownerSalt = "NonProdOwnerSaltQA";
} else if(currentEnv == "prod"){
  accountSalt = process.env.SNAKE_BCRYPT_SALT;
  aesSalt = process.env.SNAKE_AES_SALT;
  jwtSalt = process.env.SNAKE_JWT_SALT;
  ownerSalt = process.env.SNAKE_OWN_SALT;
}
if(currentEnv == "prod" && bcryptSalt.length < 20) { // make sure a salt was configured in sh env
   throw new Error("INVALID SALT PROVIDED");
}
if(currentEnv == "prod" && aesSalt.length < 20) { // make sure a salt was configured in sh env
   throw new Error("INVALID AES ENTROPY PROVIDED");
}
if(currentEnv == "prod" && jwtSalt.length < 20) { // make sure a salt was configured in sh env
   throw new Error("INVALID JWT ENTROPY PROVIDED");
}
if(currentEnv == "prod" && ownerSalt.length < 20) { // make sure a salt was configured in sh env
   throw new Error("INVALID JWT ENTROPY PROVIDED");
}
exports.bcryptSalt = accountSalt;
exports.aesSalt = aesSalt;
exports.jwtSalt = jwtSalt;
exports.ownerSalt = ownerSalt;
