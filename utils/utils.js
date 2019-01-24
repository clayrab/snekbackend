const models = require('../model.js').models;
const config = require('./config.js');
const crypt = require('./crypt.js');
const keyCache = require('./keyCache.js');
const ethereum = require("./ethereum.js");
const web3 = require("./web3Instance.js").web3;

exports.ok200 = function(value, res) {
  res.type('application/json');
  res.status(200);
  res.send(value);
}
// 400 Bad Request - The server cannot or will not process the request due to an
// apparent client error (e.g., malformed request syntax)
exports.error400 = function(error, res) {
  res.type('application/json');
  res.status(400);
  res.send(error);
}
exports.error401Unauthorized = function(res) {
  res.type('application/json');
  res.status(401);
  res.send("Unauthorized");
}
// 500 Internal Server Error
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
// exports.find = async(model, queryMap) => {
//   return await new Promise((resolve, reject) => {
//     model.find(queryMap, function(err, res){
//       if(err) {
//         reject(err);
//       }
//       resolve(res);
//     });
//   }).catch(err => {throw err});
// }

// exports.find = async(model, queryMap) => {
//   return await new Promise((resolve, reject) => {
//     model.find(queryMap, function (err, retObj) {
//       if(err){
//         resolve(null);
//       }
//       if(!retObj){
//         resolve(null);
//       }
//       resolve(retObj);
//     });
//   }).catch(err => {throw err});
// }
exports.findOne = async(model, queryMap) => {
  return await new Promise((resolve, reject) => {
    model.findOne(queryMap, function (err, retObj) {
      if(err){
        resolve(null);
      }
      if(!retObj){
        resolve(null);
      }
      resolve(retObj);
    });
  }).catch(err => {throw err});
}
exports.find = exports.findOne;

exports.findAll = async(model, queryMap) => {
  return await new Promise((resolve, reject) => {
    model.find(queryMap, function (err, retObj) {
      if(err){
        reject(err);
      }
      if(!retObj){
        reject("Object not found in model: " + JSON.stringify(queryMap));
      }
      resolve(retObj);
    });
  }).catch(err => {throw err});
}

exports.mustFind = async(model, queryMap) => {
  return await new Promise((resolve, reject) => {
    model.findOne(queryMap, function (err, retObj) {
      if(err){
        reject(err);
      }
      if(!retObj){
        reject("Object not found in model: " + JSON.stringify(queryMap));
      }
      resolve(retObj);
    });
  }).catch(err => {throw err});
}

exports.mustNotFind = async(model, queryMap) => {
  return await new Promise((resolve, reject) => {
    model.findOne(queryMap, function (err, retObj) {
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
