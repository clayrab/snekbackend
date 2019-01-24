const bcrypt = require('bcryptjs');
const crypto = require('crypto');
function stringFromFakeBytes(bytesArray){
  // bytes array is an array of Numbers that we will treat as bytes
  var retString = "";
  for(let i = 0; i < bytesArray.length; i++) {
    retString += String.fromCharCode(bytesArray[i]);
  }
  return retString;
}
function makeKeyFromPassword(password){
  for(let i = 0; i < 32; i = i + password.length) {
    password = password + password;
  }
  return password.slice(0, 32);
}
exports.encrypt = function encrypt(text, password){
  // IMPORTANT!!!!!!!!!! MUST READ!!!!!!!!!!
  // THESE FUNCTIONS ARE USING AES-CTR BLOCK CIPHER
  // https://tools.ietf.org/html/rfc3686
  // The same IV and key combination MUST NOT be used more than once!!!!!!!
  //
  // "The AES-CTR IV field MUST be eight octets.  The IV MUST be chosen by
  // the encryptor in a manner that ensures that the same IV value is used
  // only once for a given key.  The encryptor can generate the IV in any
  // manner that ensures uniqueness.  Common approaches to IV generation
  // include incrementing a counter for each packet and linear feedback
  // shift registers (LFSRs).""
  //
  // CURRENTLY THIS IS USED ONLY TO ENCRYPT PRIVATE KEYS
  // IF A USER IS CHANGING HIS PRIVATE KEY, THIS SHOULD BE OKAY, AS LONG AS THE
  // OLD KEY IS DELETED FOREVER. HOWEVER, IT WOULD BE BEST TO ADD AN IV COLUMN
  // TO EACH USER.
  //
  // DO NOT USE THESE FUNCTIONS FOR ANYTHING OTHER THAN DECRYPTING AND ENCRYPTING
  // A SINGLE PRIVATE KEY PER USER. ENCRYPTING ANY OTHER OBJECT WITHOUT UPDATING
  // THIS CODE WILL COMPRIMISE USERS KEYS!
  let iv = stringFromFakeBytes([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  let pw = makeKeyFromPassword(password);
  var cipher = crypto.createCipheriv('aes-256-ctr', pw, iv);
  var crypted = cipher.update(text,'utf8','hex');
  crypted += cipher.final('hex');
  return crypted;
}
exports.decrypt = function decrypt(text, password){
  let iv = stringFromFakeBytes([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  let pw = makeKeyFromPassword(password);
  var decipher = crypto.createDecipheriv('aes-256-ctr', pw, iv);
  var dec = decipher.update(text,'hex','utf8');
  dec += decipher.final('utf8');
  return dec;
}
exports.randomSecret = async(size) => {
  size = size || 256;
  return await new Promise((resolve, reject) => {
    crypto.randomBytes(size, (err, buf) => {
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
