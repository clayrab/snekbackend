//
// Script to convert output of "truffle develop" into users for cassandra
// >>> node convertTruffleDB.js  | pbcopy
//

function Enum() {
    for (var i in arguments) {
        this[arguments[i]] = i;
    }
}

var usersOut = [];
var dataLineRegex = /\([0-9]*\)/g;
var acctsModeRegex = /Accounts:/g;
var privKeysModeRegex = /Private[ ]Keys:/g;
var modesEnum = {"ACCOUNTS_MODE":1,"PRIVATE_KEYS_MODE":2};
var modesEnum = new Enum("ACCOUNTS_MODE", "PRIVATE_KEYS_MODE");
var mode = null;
var outFile = process.stdout;
var accountNumber = 0;

var lineReader = require('readline').createInterface({
  input: require('fs').createReadStream('truffleKeys')
});

lineReader.on('line', function (line) {
  if(line.match(acctsModeRegex)) {
    mode = modesEnum.ACCOUNTS_MODE;
  }
  if(line.match(privKeysModeRegex)) {
    mode = modesEnum.PRIVATE_KEYS_MODE;
  }
  if(line.match(dataLineRegex)) {
    if(mode == modesEnum.ACCOUNTS_MODE) {
      usersOut.push({"publicKey":line.split(" ")[1]});
    }
    if(mode == modesEnum.PRIVATE_KEYS_MODE) {
      usersOut[accountNumber].privateKey = line.split(" ")[1];
      accountNumber=accountNumber+1;
    }
  }
});

// INSERT INTO "ll"."user" (username, cardstats, privkey, pubkey)
// VALUES ('bob',{'one': 3, 'two': 5});
lineReader.on("close",function(){
  usersOut.forEach(function(user) {
    process.stdout.write("INSERT INTO \"ll\".\"user\" (name, cardstats, privkey, pubkey)\n");
    process.stdout.write(`VALUES ('${user.publicKey.slice(0,12)}',{'one': 3, 'two': 5}, '${user.privateKey}', '${user.publicKey}');\n`);
  });
});
