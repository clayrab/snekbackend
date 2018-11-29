
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

var MyModel = models.loadSchema('events', {
  fields:{
    eventId   : "int",
    eventType : "int",
    time      : "timestamp",
    date      : "varchar",
  },
  key:["eventId"]
});

MyModel.syncDB(function(err, result) {
    if (err) throw err;
});
