// // var path = require('path');
// // var favicon = require('serve-favicon');
// // var logger = require('morgan');
// // var mongoose = require('mongoose');
// // global.fetch = require("node-fetch");
// var web3 = require('web3');
// var express = require('express');
// var fetch = require("node-fetch");
// var cookieParser = require('cookie-parser');
// var bodyParser = require('body-parser'); //required for passport
// var jwt = require('jsonwebtoken');
// var passport = require('passport');
// var LocalStrategy = require('passport-local').Strategy;
// var JwtStrategy = require('passport-jwt').Strategy;
// var ExtractJwt = require('passport-jwt').ExtractJwt;
// var HDKey = require('hdkey');
// var crypto = require('crypto');
//
// var models = require('./model.js').models;
// var rewardTokenABI = require('./eth/abi/RewardToken.json');
// var dgtTokenABI = require('./eth/abi/DGT.json');
// var dgtSubTokenABI = require('./eth/abi/DGTSubToken.json');
// // var testTokenABI = require('/Users/clay/projects/rewardCoin/truffle/build/contracts/TestToken.json');
// var web3 = new web3(web3.givenProvider || "ws://127.0.0.1:9545");
// // TODO add gas and gasprice options to contract
//
// var app = express();
// app.use(passport.initialize());
// // Needed for passport local strategy
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({
//   extended: false
// }));
// app.use(cookieParser());
//
// //app.use(express.static(path.join(__dirname, 'public')));
//
// passport.use(new LocalStrategy({
//     usernameField: 'user',
//     passwordField: 'pw'
//   },
//   function(username, password, done) {
//     models.instance.user.findOne({ name: username }, function (err, user) {
//       if (err) {
//         return done(err);
//       }
//       if (!user) {
//         return done(null, false, { message: 'Incorrect username.' });
//       }
//       if(password != "asdf") {
//         return done(null, false, { message: 'Incorrect password.' });
//       }
//       return done(null, user);
//     });
//   }
// ));
//
// var jwtOptions = {}
// //TODO: move this externally and change it
// jwtOptions.secretOrKey = '7x0jhxt"9(thpX6'
// jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('JWT');
// passport.use('jwt', new JwtStrategy(jwtOptions, function(jwt_payload, done) {
//   models.instance.user.findOne({
//     name: jwt_payload.name
//   }, function(err, user) {
//     if (err) {
//       return done(err, false);
//     }
//     if (user) {
//       done(null, user);
//     } else {
//       done(null, false);
//     }
//   })
// }))
//
//
//
//
// app.post('/login', function(req, res, next) {
//   try {
//     passport.authenticate('local', function(err, user, info) {
//       if(err){
//         res.type('application/json');
//         res.status(200);
//         res.send(err);
//       } else if(info){
//         res.type('application/json');
//         res.status(200);
//         res.send(info);
//       } else if(user){
//         var payload = {name: user.name};
//         var token = jwt.sign(payload, jwtOptions.secretOrKey, {expiresIn: 86400 * 30});
//         jwt.verify(token, jwtOptions.secretOrKey, function(err, data){
//           console.log('err, data');
//           console.log(err, data);
//         });
//         res.type('application/json');
//         res.status(200);
//         res.send({token: token});
//       }
//     })(req, res, next);
//   } catch (err) {
//     next(err);
//   }
// });
//
// app.get('/secure', passport.authenticate('jwt', { session: false }),
//   function(req, res) {
//     //TODO add in try/catch
//     res.send(req.user);
//   }
// );
// // (0) 0x627306090abab3a6e1400e9345bc60c78a8bef57
// // (1) 0xf17f52151ebef6c7334fad080c5704d77216b732
// // (2) 0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef
// // (3) 0x821aea9a577a9b44299b9c15c88cf3087f3b5544
// //
// // Private Keys:
// // (0) c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3
// // (1) ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f
// // (2) 0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1
// // (3) c88b703fb0
//
// // removeAuthorizedEntityClassA(address addr) public returns(bool)
// // isClassAAuthorized(address addr) public view returns(bool)
// // reward(address _to, uint256 _value) public onlyByClassA returns(bool)
// // addAuthorizedEntityClassA(address addr) public onlyBy(owner) returns(bool)
//
// app.post('/adddealer', passport.authenticate('jwt', { session: false }), async(req, res) => {
//   //var receipt = await contract.methods.transfer("0xf17f52151ebef6c7334fad080c5704d77216b732", 101).send({from: req.user.pubkey});
// });
//
// app.post('/sendtokens', passport.authenticate('jwt', { session: false }), async(req, res) => {
//   var retData = {};
//   var contract = new web3.eth.Contract(rewardTokenABI.abi);
//   var receipt = await contract.methods.transfer(req.body.to, req.body.amount).send({from: req.user.pubkey});
//   retData.txHash = receipt.transactionHash;
//   res.type('application/json');
//   res.status(200);
//   res.send(retData);
// })
//
// app.post('/getcontractdata', passport.authenticate('jwt', { session: false }), async(req, res, next) => {
//   // TODO: validate these
//   console.log(req.body.name);
//
//   try {
//     models.instance.contract.findOne({name: 'DGT'}, async function(err, dgtDBObj){
//       if(err) throw err;
//       var retData = {};
//       if(dgtDBObj != null) {
//         var dgtContract = new web3.eth.Contract(dgtTokenABI.abi, dgtDBObj.address);
//         var dgtSubContract = new web3.eth.Contract(dgtSubTokenABI.abi);
//         dgtContract.methods.getSubTokens().call(async function(error, addresses){
//           for(let i = 0; i < addresses.length; i++) {
//             dgtSubContract.options.address = addresses[i];
//             var contractName = await dgtSubContract.methods.name().call(function(error, name){
//               return name;
//             });
//             if(contractName == req.body.name) {
//               break;
//             }
//           }
//           retData.balance = await dgtSubContract.methods.balanceOf(req.user.pubkey).call(function(error, result){
//             return result;
//           });
//           retData.owner = await dgtSubContract.methods.owner().call(function(error, result){
//             return result;
//           });
//           retData.ethBalance = await web3.eth.getBalance(req.user.pubkey, function(error, result) {
//             return res.toString(10);
//           });
//
//           res.type('application/json');
//           res.status(200);
//           res.send(retData);
//         });
//       }
//     });
//   } catch (err) {
//     next(err);
//   }
// });
//
// app.get('/getcontracts', passport.authenticate('jwt', { session: false }), async(req, res, next) => {
//   try {
//     models.instance.contract.findOne({name: 'DGT'}, async function(err, dgtDBObj){
//       if(err) throw err;
//       var retArray = [];
//       if(dgtDBObj != null) {
//         var dgtContract = new web3.eth.Contract(dgtTokenABI.abi, dgtDBObj.address);
//         var dgtSubContract = new web3.eth.Contract(dgtSubTokenABI.abi);
//         dgtContract.methods.getSubTokens().call(async function(error, addresses){
//           for(let i = 0; i < addresses.length; i++) {
//             console.log(i);
//             console.log(addresses[i]);
//
//             dgtSubContract.options.address = addresses[i];
//             await dgtSubContract.methods.name().call(function(error, name){
//               console.log("name");
//               console.log(web3.utils.hexToUtf8(name));
//               retArray.push({
//                 "name": web3.utils.hexToUtf8(name).trim(),
//                 "address": addresses[i],
//               });
//             });
//           }
//           res.type('application/json');
//           res.status(200);
//           res.send(retArray);
//         });
//       }
//
//     });
//   } catch (err) {
//     next(err);
//   }
// });
//
// app.post('/preparecontract', passport.authenticate('jwt', { session: false }), async(req, res, next) => {
//   // TODO write this
//   // Should estimate gas cost, return to user, confirm, then deploy/send via /createcontract
//   try {
//
//   } catch (err) {
//     next(err);
//   }
// });
//
//
// app.post('/createdgttoken', passport.authenticate('jwt', { session: false }), async(req, res, next) => {
//   // TODO validate
//   console.log(req.body.name);
//   console.log(req.body.decimals);
//   console.log(req.body.totalSupply);
//
//   try {
//     let args = [web3.utils.asciiToHex(req.body.name), req.body.decimals, req.body.totalSupply];
//     var block = await web3.eth.getBlock("latest");
//     let gasEstimate = await web3.eth.estimateGas({data: dgtTokenABI.bytecode});
//     let rewardContract = new web3.eth.Contract(dgtTokenABI.abi);
//     let deployTx = rewardContract.deploy({data: dgtTokenABI.bytecode, arguments : args});
//     console.log("gasLimit: " + block.gasLimit);
//     console.log("gas estimate:" + gasEstimate);
//     deployTx.send({
//       from: req.user.pubkey,
//       gas: 4000000, // 4m is ~ the limit
//       gasPrice: 10000000,
//     }, function(error, transactionHash){
//       console.log("transcationhash: " + transactionHash);
//     })
//     .on('error', function(error){
//       console.log("error: " + error);
//     })
//     .on('transactionHash', function(transactionHash){
//       console.log("on transcationhash: " + transactionHash);
//     })
//     .on('receipt', function(receipt){
//       console.log("receipt.contractAddress"); // contains the new contract address
//       console.log(receipt.contractAddress); // contains the new contract address
//       var newContract = new models.instance.contract({
//           name: req.body.name,
//           version_major: 0,
//           version_minor: "001",
//           address: receipt.contractAddress,
//           abi: rewardTokenABI.abi
//       });
//       newContract.save(function(err){
//         res.type('application/json');
//         res.status(200);
//         res.send(newContract);
//       });
//     })
//     .on('confirmation', function(confirmationNumber, receipt){
//       // fires each time tx is mined up to the 24th confirmationNumber
//       console.log("confirmationNumber: " + confirmationNumber);
//      })
//     .then(function(newContractInstance){
//       console.log("newContractInstance.options.address");
//       console.log(newContractInstance.options.address);
//     });
//   } catch (err) {
//     next(err);
//   }
// });
//
// app.post('/createdgtsubtoken', passport.authenticate('jwt', { session: false }), async(req, res, next) => {
//   //TODO: validate
//   console.log(req.body.name);
//   console.log(req.body.totalSupply);
//
//     try {
//       models.instance.contract.findOne({name: 'DGT'}, async function(err, dgtDBObj){
//         if(err) throw err;
//         console.log('Found ', dgtDBObj.name);
//         var dgtContract = new web3.eth.Contract(dgtTokenABI.abi, dgtDBObj.address);
//         var tx = dgtContract.methods.addSubToken(web3.utils.asciiToHex(req.body.name), req.body.totalSupply);
//         tx.call(function(error, result){
//           if(error !== null) {
//             throw error;
//           } else if (!result) {
//             throw "error calling token function";
//           }
//           tx.send({
//             from: req.user.pubkey,
//             gas: 4000000, // 4m is ~ the limit
//             gasPrice: 10000000,
//           }, function(error, transactionHash){
//             console.log("transcationhash: " + transactionHash);
//           })
//           .on('error', function(error){
//             console.log("error: " + error);
//           })
//           .on('transactionHash', function(transactionHash){
//             console.log("on transcationhash: " + transactionHash);
//           })
//           .on('receipt', function(receipt){
//             console.log("receipt"); // contains the new contract address
//             console.log(receipt); // contains the new contract address
//             console.log("gasUsed");
//             console.log(receipt.gasUsed);
//             res.type('application/json');
//             res.status(200);
//             res.send({
//               "result" : result,
//               "receipt": receipt
//             });
//           })
//           .on('confirmation', function(confirmationNumber, receipt){
//             // fires each time tx is mined up to the 24th confirmationNumber
//             console.log("confirmationNumber: " + confirmationNumber);
//            })
//           .then(function(newContractInstance){
//
//           });
//         });
//       });
//     } catch (err) {
//       next(err);
//     }
// });
//
// app.get('/getdgtowner',  async (req, res, next) => {
//   try {
//     models.instance.contract.findOne({name: 'DGT'}, function(err, dgtDBObj){
//       if(err) throw err;
//       console.log('Found ', dgtDBObj.name);
//       var dgtContract = new web3.eth.Contract(dgtTokenABI.abi, dgtDBObj.address);
//       dgtContract.methods.owner().call(function(error, result){
//         if(error !== null) {
//           // TODO handle these errors
//         }
//         console.log(dgtDBObj.name);
//         res.type('application/json');
//         res.status(200);
//         res.send(result);
//       });
//     });
//   } catch (err) {
//     next(err);
//   }
// });
//
//
// app.post('/createuserfromvin', async (req, res, next) => {
//   console.log(req.body.username);
//   console.log(req.body.vin);
//
//   let entropy = crypto.randomBytes(64).toString('hex');
//   //web3.utils.randomHex(size);
//   var acct = web3.eth.accounts.create([entropy]);
// //-- address - string: The account address.
// //-- privateKey - string: The accounts private key. This should never be shared or stored unencrypted in localstorage! Also make sure to null the memory after usage.
// //-- signTransaction(tx [, callback]) - Function: The function to sign transactions. See web3.eth.accounts.signTransaction() for more.
// //-- sign(data) - Function: The function to sign transactions. See web3.eth.accounts.sign() for more.
// //-- web3.eth.accounts.privateKeyToAccount(privateKey);
// //-- web3.eth.accounts.recoverTransaction(rawTransaction);
// //--    Recovers the Ethereum address which was used to sign the given RLP encoded transaction.
// //--   This is checking a digital signature?
// //--
//
// });
// app.post('/createuser', async (req, res, next) => {
//   // TODO: finish this function
//   console.log(req.body.username);
//   console.log(req.body.pubkey);
//   console.log(req.body.privkey);
//   console.log(req.body.vin);
//   try {
//     var newuser = new models.instance.user({
//         name: req.body.username,
//         privkey : req.body.privkey,
//         pubkey: req.body.pubkey,
//     });
//     var items = null;
//     newuser.save(function(err){
//       if(err) {
//         res.type('application/json');
//         res.status(500);
//         res.send(err);
//       } else {
//         res.type('application/json');
//         res.status(200);
//         res.send(newuser);
//       }
//     });
//   } catch (err) {
//     next(err);
//   }
// });
//
// app.get('/getusers', async (req, res, next) => {
//   try {
//     var query = {
//       $limit: 10
//     }
//     models.instance.user.find(query, {raw: true}, function(err, users){
//       if(err) throw err;
//       res.type('application/json');
//       res.status(200);
//       res.send(users);
//     });
//   } catch (err) {
//     next(err);
//   }
// });
//
// app.post('/createcontractold', passport.authenticate('jwt', { session: false }), async(req, res, next) => {
//   try {
//
//     let args = [web3.utils.asciiToHex(req.body.name), req.body.decimals, req.body.totalSupply];
//     var block = await web3.eth.getBlock("latest");
//     let gasEstimate = await web3.eth.estimateGas({data: rewardTokenABI.bytecode});
//     let rewardContract = new web3.eth.Contract(rewardTokenABI.abi);
//     let deployTx = rewardContract.deploy({data: rewardTokenABI.bytecode, arguments : args});
//
//     deployTx.send({
//       from: req.user.pubkey,
//       gas: 4000000, // 4m is ~ the limit
//       gasPrice: 10000000,
//     }, function(error, transactionHash){
//       console.log("transcationhash: " + transactionHash);
//     })
//     .on('error', function(error){
//       console.log("error: " + error);
//     })
//     .on('transactionHash', function(transactionHash){
//       console.log("on transcationhash: " + transactionHash);
//     })
//     .on('receipt', function(receipt){
//       console.log("receipt.contractAddress"); // contains the new contract address
//       console.log(receipt.contractAddress); // contains the new contract address
//       models.instance.user.findOne({name: req.user.name}, function(err, user){
//         if(err) throw err;
//         let contracts = user.contracts || {};
//         contracts[req.body.name] = {
//           name: req.body.name,
//           address: receipt.contractAddress,
//           version_major: 0,
//           version_minor: "001",
//         };
//         user.contracts = contracts;
//         user.save(function(err){
//           res.type('application/json');
//           res.status(200);
//           res.send(user);
//         });
//       });
//     })
//     .on('confirmation', function(confirmationNumber, receipt){
//       // fires each time tx is mined up to the 24th confirmationNumber
//       console.log("confirmationNumber: " + confirmationNumber);
//      })
//     .then(function(newContractInstance){
//       console.log("newContractInstance.options.address");
//       console.log(newContractInstance.options.address);
//     });
//   } catch (err) {
//     next(err);
//   }
// });
//
// app.post('/getcontractdataold', passport.authenticate('jwt', { session: false }), async(req, res, next) => {
//   try {
//     var contract = new web3.eth.Contract(rewardTokenABI.abi);
//     models.instance.user.findOne({name: req.user.name}, async(err, user) => {
//       if(err) throw err;
//       var retData = {};
//       contract.options.address = user.contracts[req.body.name].address;
//       retData.balance = await contract.methods.balanceOf(req.user.pubkey).call(function(error, result){
//         // TODO handle these errors
//         return result;
//       });
//       retData.owner = await contract.methods.owner().call(function(error, result){
//         if(error !== null) {
//           // TODO handle these errors
//         }
//         return result;
//       });
//       retData.ethBalance = await web3.eth.getBalance(req.user.pubkey, function(err, res) {
//         return res.toString(10);
//       });
//       res.type('application/json');
//       res.status(200);
//       res.send(retData);
//     });
//
//
//   } catch (err) {
//     next(err);
//   }
// });
//
// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   var err = new Error('Not Found');
//   err.status = 404;
//   next(err);
// });
//
// // error handlers
// app.use(function(err, req, res, next) {
//   res.status(err.status || 500);
//   res.type('application/json');
//   res.send({error: err.message});
// });
//
//
// app.listen(3001, () => console.log('Example app listening on port 3001!'))
//
// module.exports = app;
