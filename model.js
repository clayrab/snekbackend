
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

//        price
//          name      : "varchar",
//          value     : "bigint",
//          key:["name"],
//        purchase
//          username      : "varchar",
//          type          : "varchar",
//          value         : "bigint",
//          details       : "varchar",
//          key:["username", "type"],
//        user
//          pubkey        : "varchar",
//          name          : "varchar",
//          pwcrypt       : "varchar",
//          keycrypt      : "varchar",
//          unredeemed    : "int",
//          mineMax       : "int",
//          mineUpgraded  : "boolean", //bitmask
//          purchasedGames: { type: "map", typeDef: "<varchar, int>" },
//          haul          : "int",
//          gamecount     : "int",
//          totalWinnings : "int",
//          key:["pubkey"],
       // usergames
       //   pubkey    : "varchar",
       //   gameids   : { type: "list", typeDef: "<varchar>" },
       //   key:["pubkey"],
//        userpowerups
//          pubkey    : "varchar",
//          powerups   : { type: "map", typeDef: "<varchar, int>" },
//          key:["pubkey"],
//        game
//          pubkey    : "varchar",
//          time      : "timestamp",
//          level     : "int",
//          score     : "int",
//          powerups  : "int",
//          key:[["pubkey"], "time"],
//        transaction
//          pubkey    : "varchar",
//          txhash    : "varchar",
//          time      : "timestamp",
//          type      : "varchar",
//          from      : "varchar",
//          to        : "varchar",
//          amount    : "bigint",
//          fee       : "bigint",
//          key:[["pubkey"], "time"],
//        usermap
//          name      : "varchar",
//          pubkey    : "varchar",
//          key:["name"]
//        chainevent
//          pubkey        : "varchar",
//          txid          : "varchar",
//          type          : "varchar",
//          blocknumber   : "int",
//          blockhash     : "varchar",
//          timesReorged  : "int",
//          distReorged   : "int",
//          key: ["pubkey","txid"]
       // userchainevents
       //   userpubkey    : "varchar",
       //   chainevents   : { type: "set", typeDef: "<varchar>"}
       //   key: ["userpubkey"]
//        contract
//          name          : "varchar",
//          owner         : "varchar",
//          address       : "varchar",
//          abi           : "varchar",
//          bytecode      : "varchar",
//          key: ["name"]
//        block
//          number          : "int",
//          hashid          : "varchar",
//          timesReorged    : "int",
//          key: ["number"],

//          ***** BEGIN FILE *****
let port = 9042;
let host = '127.0.0.1';
let keyspace = 'sc';
if(config.currentEnv == "qa"){
  port = 9043;
  host = '127.0.0.1';
  keyspace = 'scqa';
} else if(config.currentEnv == "prod"){
  port = 9044;
  keyspace = 'scprod';
}
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
  }),
};
let models = module.exports.models;
let PriceModel = models.loadSchema('price', {
  fields: {
    name      : "varchar",
    value     : "bigint",
  },
  key:["name"],
});
PriceModel.syncDB(function(err, result) {
    if (err) throw err;
});
let PurchaseModel = models.loadSchema('purchase', {
  fields: {
    username      : "varchar",
    type          : "varchar",
    value         : "bigint",
    details       : "varchar",
  },
  key:["username", "type"],
});
PurchaseModel.syncDB(function(err, result) {
    if (err) throw err;
});
let UserModel = models.loadSchema('user', {
  fields: {
    //roles     : { type: "set", typeDef: "<int>"},
    pubkey        : "varchar",
    name          : "varchar",
    pwcrypt       : "varchar",
    keycrypt      : "varchar",
    unredeemed    : "int",
    mineMax       : "int",
    mineUpgraded  : "boolean", //bitmask
    purchasedGames: { type: "map", typeDef: "<varchar, int>" },
    haul          : "int",
    gamecount     : "int",
    totalWinnings : "int",
    //avgPerGame    : "double", // for histogram
    //totalhaul     : "int",
  },
  key:["pubkey"],
});
UserModel.syncDB(function(err, result) {
    if (err) throw err;
});
// let UserGamesModel = models.loadSchema('usergames', {
//   fields: {
//     pubkey    : "varchar",
//     gameids   : {
//       type: "list",
//       typeDef: "<varchar>"
//     },
//   },
//   key:["pubkey"],
// });
// UserGamesModel.syncDB(function(err, result) {
//     if (err) throw err;
// });
let PowerupModel = models.loadSchema('userpowerups', {
  fields: {
    pubkey    : "varchar",
    powerups   : {
      type: "map",
      typeDef: "<varchar, int>"
    },
  },
  key:["pubkey"],
});
PowerupModel.syncDB(function(err, result) {
    if (err) throw err;
});

let GameModel = models.loadSchema('game', {
  fields: {
    pubkey    : "varchar",
    time      : "timestamp",
    level     : "int",
    score     : "int",
    powerups  : "int",
  },
  key:[["pubkey"], "time"],
});
GameModel.syncDB(function(err, result) {
    if (err) throw err;
});
let TransactionModel = models.loadSchema('transaction', {
  fields: {
    pubkey    : "varchar",
    txhash    : "varchar",
    time      : "timestamp",
    type      : "varchar",
    from      : "varchar",
    to        : "varchar",
    amount    : "bigint",
    fee       : "bigint",
  },
  key:[["pubkey"], "time"],
});
TransactionModel.syncDB(function(err, result) {
    if (err) throw err;
});

let UserMapModel = models.loadSchema('usermap', {
  fields: {
    name      : "varchar",
    pubkey    : "varchar",
  },
  key:["name"],
});
UserMapModel.syncDB(function(err, result) {
    if (err) throw err;
});

let ChainEventModel = models.loadSchema('chainevent', {
  fields:{
    pubkey        : "varchar",
    txid          : "varchar",
    type          : "varchar",
    blocknumber   : "int",
    blockhash     : "varchar",
    //confblock     : "int",
    timesReorged  : "int",
    distReorged   : "int",
  },
  key: ["pubkey"]
});

ChainEventModel.syncDB(function(err, result) {
    if (err) throw err;
});
//
// let UserChainEventModel = models.loadSchema('userchainevents', {
//   fields:{
//     userpubkey    : "varchar",
//     chainevents   : {
//       type: "set",
//       typeDef: "<varchar>"
//     }
//   },
//   key: ["userpubkey"]
// });
//
// UserChainEventModel.syncDB(function(err, result) {
//     if (err) throw err;
// });

let ContractModel = models.loadSchema('contract', {
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

let BlockModel = models.loadSchema('block', {
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
