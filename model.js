
var ExpressCassandra = require('express-cassandra');

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
module.exports = {
 models:  ExpressCassandra.createClient({
    clientOptions: {
        contactPoints: ['127.0.0.1'],
        protocolOptions: { port: 9042 },
        keyspace: 'sc',
        queryOptions: {consistency: ExpressCassandra.consistencies.one}
    },
    ormOptions: {
      udts: {
        contract : {
          name          : "varchar",
          version_major : "int",
          version_minor : "varchar",
          address       : "varchar"
        },
      },
      udfs: {
        fLog: {
            language: 'java',
            code: 'return Double.valueOf(Math.log(input.doubleValue()));',
            returnType: 'double',
            inputs: {
                input: 'double'
            }
        },
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
var MyModel = models.loadSchema('user', {
  fields: {
    name      : "varchar",
    //roles     : { type: "set", typeDef: "<int>"},
    pubkey    : "varchar",
    pwcrypt   : "varchar",
    keycrypt  : "varchar",
    unredeemed: "int",
    mineMax   : "int",
    haul      : "int",
  },
  key:["name"],
});

MyModel.syncDB(function(err, result) {
    if (err) throw err;
});

var MyModel = models.loadSchema('contract', {
  fields:{
    name          : "varchar",
    owner         : "varchar",
    address       : "varchar",
    abi           : "varchar",
    bytecode      : "varchar",
    // version_major : "int",
    // version_minor : "varchar",
    //
  },
  key:["name"]
});

MyModel.syncDB(function(err, result) {
    if (err) throw err;
});

// Event Types:
// 1: rewardPreTokens
// 2: blacklist user
// 3: new user
// 4: mine
// 5: free mine
// 6: powerup bought
// 7: powerup used
var MyModel = models.loadSchema('event', {
  fields: {
    // basic event fields
    eventId       : "int",
    date          : "varchar",
    eventType     : "int",
    time          : "timestamp",
    // 1: rewardPreTokens
    rpt_amount    : "int",
    // 2: blacklist user
    bl_reason     : "int",
    // 3: new user
    // 4: mine
    mn_amount     : "int",
    mn_eth_amount : "int",
    // 5: free mine
    fmn_amount    : "int",
    fmn_snk_amount: "int",
    // 6: powerup purchased
    pup_type      : "int",
    pup_amount    : "int",
    pup_snk_amount: "int",
    // 7: powerup used
    puu_type      : "int",
  },
  key: ["eventId", "date"],
});

MyModel.syncDB(function(err, result) {
    if (err) throw err;
});
