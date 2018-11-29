
var crypto = require('crypto');
exports.encrypt = function encrypt(text, password){
  var cipher = crypto.createCipher('aes-256-ctr', password);
  var crypted = cipher.update(text,'utf8','hex');
  crypted += cipher.final('hex');
  return crypted;
}
exports.decrypt = function decrypt(text, password){
  var decipher = crypto.createDecipher('aes-256-ctr',password);
  var dec = decipher.update(text,'hex','utf8');
  dec += decipher.final('utf8');
  return dec;
}
exports.randomSecret = async() => {
  return await new Promise((resolve, reject) => {
    crypto.randomBytes(256, (err, buf) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf.toString('hex'))
      }
    });
  }).catch(err => {throw err});
}
