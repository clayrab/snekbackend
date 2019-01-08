
const ExpressCassandra = require('express-cassandra');
const config = require("./utils/config.js");
// COLLECTION TYPES:
// mymap: {
//         type: "map",
//         typeDef: "<varchar, text>"
//     },
// Lists have limitations and specific performance considerations. Use a frozen
// list to decrease impact. In general, use a set instead of list.
//     mylist: {
//         type: "list",
//         typeDef: "<varchar>"
//     },
//     myset: {
//         type: "set",
//         typeDef: "<varchar>"
//     }
// let port = 9042;
// let host = '127.0.0.1';
// let keyspace = 'sc';

let port = 9042;
let host = '127.0.0.1';
let keyspace = 'sc';
if(config.currentEnv == "qa"){
  // user different port and keyspace so we don't accidentally sync to the wrong chain.
  port = 9042;
  host = '127.0.0.1';
  keyspace = 'scqa';
} else if(config.currentEnv == "prod"){
  port = 9044;
  keyspace = 'scprod';
}
console.log("cassandra port: " + port)
module.exports = {
 models:  ExpressCassandra.createClient({
    clientOptions: {
        contactPoints: [host],
        protocolOptions: { port: port },
        keyspace: keyspace,
        queryOptions: {consistency: ExpressCassandra.consistencies.one}
    },
    ormOptions: {
      udts: {
        // contract : {
        //   name          : "varchar",
        //   version_major : "int",
        //   version_minor : "varchar",
        //   address       : "varchar"
        // },
        // game: {
        //   levelname     : "varchar",
        //   score         : "int",
        //   powerups      : "int",
        // }
      },
      udfs: {
        // fLog: {
        //     language: 'java',
        //     code: 'return Double.valueOf(Math.log(input.doubleValue()));',
        //     returnType: 'double',
        //     inputs: {
        //         input: 'double'
        //     }
        // },
      },
      defaultReplicationStrategy : {
          class: 'SimpleStrategy',
          replication_factor: 1
      },
      migration: 'safe',
    }
  })
};
let models = module.exports.models;
var UserModel = models.loadSchema('user', {
  fields: {
    //roles     : { type: "set", typeDef: "<int>"},
    pubkey    : "varchar",
    name      : "varchar",
    pwcrypt   : "varchar",
    keycrypt  : "varchar",
    unredeemed: "int",
    //approved  : "int",
    mineMax   : "int",
    haul      : "int",
    gamecount : "int",
    totalhaul : "int",
  },
  key:["pubkey"],
});
UserModel.syncDB(function(err, result) {
    if (err) throw err;
});

var UserModel = models.loadSchema('usergames', {
  fields: {
    //roles     : { type: "set", typeDef: "<int>"},
    pubkey    : "varchar",
    gameids   : {
      type: "list",
      typeDef: "<varchar>"
    },
  },
  key:["pubkey"],
});
UserModel.syncDB(function(err, result) {
    if (err) throw err;
});

var UserModel = models.loadSchema('game', {
  fields: {
    //roles     : { type: "set", typeDef: "<int>"},
    pubkey    : "varchar",
    time      : "timestamp",
    levelname : "varchar",
    score     : "int",
    powerups  : "int",
  },
  key:[["pubkey"], "time"],
});
UserModel.syncDB(function(err, result) {
    if (err) throw err;
});

var UserMapModel = models.loadSchema('usermap', {
  fields: {
    name      : "varchar",
    pubkey    : "varchar",
  },
  key:["name"],
});
UserMapModel.syncDB(function(err, result) {
    if (err) throw err;
});

var ChainEventModel = models.loadSchema('chainevent', {
  fields:{
    txid          : "varchar",
    userpubkey    : "varchar",
    type          : "varchar",
    blocknumber   : "int",
    blockhash     : "varchar",
    //confblock     : "int",
    timesReorged  : "int",
    distReorged   : "int",
  },
  key: ["txid"]
});

ChainEventModel.syncDB(function(err, result) {
    if (err) throw err;
});

var UserChainEventModel = models.loadSchema('userchainevents', {
  fields:{
    userpubkey    : "varchar",
    chainevents   : {
      type: "set",
      typeDef: "<varchar>"
    }
  },
  key: ["userpubkey"]
});

UserChainEventModel.syncDB(function(err, result) {
    if (err) throw err;
});

var ContractModel = models.loadSchema('contract', {
  fields:{
    name          : "varchar",
    owner         : "varchar",
    address       : "varchar",
    abi           : "varchar",
    bytecode      : "varchar",
  },
  key: ["name"]
});

ContractModel.syncDB(function(err, result) {
    if (err) throw err;
});

var BlockModel = models.loadSchema('block', {
  fields: {
    number          : "int",
    hashid          : "varchar",
    timesReorged    : "int",
  },
  key: ["number"],
  //clustering_order: {"number": "desc"},
});

BlockModel.syncDB(function(err, result) {
    if (err) throw err;
});


// var SyncModel = models.loadSchema('synchronization', {
//   fields:{
//     type          : "varchar",
//     latest        : "int",
//   },
//   key:["type",]
// });
//
// SyncModel.syncDB(function(err, result) {
//     if (err) throw err;
// });

// Event Types:
// 1: rewardPreTokens
// 2: blacklist user
// 3: new user
// 4: mine
// 5: free mine
// 6: powerup bought
// 7: powerup used
// var EventModel = models.loadSchema('event', {
//   fields: {
//     // basic event fields
//     eventId       : "int",
//     date          : "varchar",
//     eventType     : "int",
//     time          : "timestamp",
//     // 1: rewardPreTokens
//     rpt_amount    : "int",
//     // 2: blacklist user
//     bl_reason     : "int",
//     // 3: new user
//     // 4: mine
//     mn_amount     : "int",
//     mn_eth_amount : "int",
//     // 5: free mine
//     fmn_amount    : "int",
//     fmn_snk_amount: "int",
//     // 6: powerup purchased
//     pup_type      : "int",
//     pup_amount    : "int",
//     pup_snk_amount: "int",
//     // 7: powerup used
//     puu_type      : "int",
//   },
//   key: ["eventId", "date"],
// });
//
// EventModel.syncDB(function(err, result) {
//     if (err) throw err;
// });
