const bcrypt = require('bcrypt');
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
exports.error500 = function(error, res) {
  res.type('application/json');
  res.status(500);
  res.send(error);
}

exports.error401Unauthorized = function(res) {
  res.type('application/json');
  res.status(401);
  res.send("Unauthorized");
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
exports.find  = async(model, queryMap) => {
  return await new Promise((resolve, reject) => {
    model.find(queryMap, function(err, collection){
      if(err) throw err;
      //people is an array of model instances containing the persons with name `John`
      resolve(collection);
    });
  }).catch(err => {throw err});
}

exports.find = async(model, queryMap) => {
  return await new Promise((resolve, reject) => {
    model.findOne(queryMap, {allow_filtering: true}, function (err, retObj) {
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

exports.findAll = async(model, queryMap) => {
  return await new Promise((resolve, reject) => {
    model.find(queryMap, {allow_filtering: true}, function (err, retObj) {
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
    model.findOne(queryMap, {allow_filtering: true}, function (err, retObj) {
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
