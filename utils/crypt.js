const bcrypt = require('bcrypt');
const crypto = require('crypto');
exports.encrypt = function encrypt(text, password){
  // do not use a global iv for production,
  // generate a new one for each encryption
  //let iv = 'FnJL7EDzjqWjcaY9';
  const iv = crypto.randomBytes(16).slice(0, 16);
  //const pw = crypto.randomBytes(32).slice(0, 32);
  let pw = (password + "dsafugdafdaf7dafidbfadufioadsfasdhfka)").slice(0,32);
  console.log(pw);
  //let pw = 'FnJL7EDzjqWjasdf';
  var cipher = crypto.createCipheriv('aes-256-ctr', pw, iv);
  //var cipher = crypto.createCipheriv('aes-256-ctr', password, iv);

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
exports.bcryptHash = async(pw, saltRounds) => {
  return await new Promise((resolve, reject) => {
    bcrypt.hash(pw, saltRounds, async(err, storableHash) => {
      if(err){
        reject(err);
      } else {
        resolve(storableHash);
      }
    });
  }).catch(err => {throw err});
}
exports.bcryptCompare = async(pw, data) => {
  return await new Promise((resolve, reject) => {
    bcrypt.compare(pw, data, function(err, res) {
      if(err){
        reject(err);
      } else {
        resolve(res);
      }
    });
  }).catch(err => {throw err});
}
