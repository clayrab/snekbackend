const bcrypt = require('bcrypt');

exports.ok200 = function(value, res) {
  res.type('application/json');
  res.status(200);
  res.send(value);
}
exports.error500 = function(error, res) {
  res.type('application/json');
  res.status(500);
  res.send(error);
}
exports.save = async(model, done) => {
  return await new Promise((resolve, reject) => {
    model.save(function(err){
      if(err) {
        reject(err);
      } else {
        resolve();
      }
    });
  }).catch(err => {throw err});
}
exports.mustFind = async(model, keyMap) => {
  return await new Promise((resolve, reject) => {
    model.findOne(keyMap, function (err, retObj) {
      if(err){
        reject(err);
      }
      if(!retObj){
        reject("Object not found in model: " + retObj);
      }
      resolve(retObj);
    });
  }).catch(err => {throw err});
}

exports.mustNotFind = async(model, keyMap, done) => {
  return await new Promise((resolve, reject) => {
    model.findOne(keyMap, function (err, retObj) {
      if(err){
        reject(err);
      } else if(retObj){
        reject("Object already exists!");
      } else {
        resolve();
      }
    });
  }).catch(err => {throw err});
}


// Creating a new Promise like the other answers suggest works fine in this case, but as a general rule, util.promisify can stop you from writing the same thing many times.
//
// So you can do something like this instead: (node.js v8.0.0+)
//
// const util = require('util');
// async function start() {
//     let server = Http.createServer(app);
//     await util.promisify(server.listen.bind(server))(port);
// }
