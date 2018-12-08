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

exports.save = async(model) => {
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

exports.mustNotFind = async(model, keyMap) => {
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
