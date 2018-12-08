// Set the current environment to true in the env object
var currentEnv = process.env.SNAKE_ENV || 'development';
exports.env = {
  production: false,
  staging: false,
  test: false,
  development: false
};
exports.owner = "clayrab";
exports.env[currentEnv] = true;
exports.jwtExpirationTime = 172800 //2*24*60*60;
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
