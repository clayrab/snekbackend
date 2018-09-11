
// This script only populates dev db
// This script was otherwise abandoned in favor of express-cassandra
// The model can now be found in model.js.
// This file can be deleted safely.

// In application, keep all cards in lazy-cached memory
// When "drawing" cards for a user, read their cardstats and compute the {AllCards}-{SolvedCards}+{FreshSolvedCards}
// Cards are 'refreshened' based on the special exponential(log) algorithm.

INSERT INTO "ll"."user" (name, cardstats, privkey, pubkey)
VALUES ('0x627306090a',{'one': 3, 'two': 5}, 'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3', '0x627306090abab3a6e1400e9345bc60c78a8bef57');
INSERT INTO "ll"."user" (name, cardstats, privkey, pubkey)
VALUES ('0xf17f52151e',{'one': 3, 'two': 5}, 'ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f', '0xf17f52151ebef6c7334fad080c5704d77216b732');
INSERT INTO "ll"."user" (name, cardstats, privkey, pubkey)
VALUES ('0xc5fdf4076b',{'one': 3, 'two': 5}, '0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1', '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef');
INSERT INTO "ll"."user" (name, cardstats, privkey, pubkey)
VALUES ('0x821aea9a57',{'one': 3, 'two': 5}, 'c88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c', '0x821aea9a577a9b44299b9c15c88cf3087f3b5544');
INSERT INTO "ll"."user" (name, cardstats, privkey, pubkey)
VALUES ('0x0d1d4e623d',{'one': 3, 'two': 5}, '388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418', '0x0d1d4e623d10f9fba5db95830f7d3839406c6af2');
INSERT INTO "ll"."user" (name, cardstats, privkey, pubkey)
VALUES ('0x2932b7a235',{'one': 3, 'two': 5}, '659cbb0e2411a44db63778987b1e22153c086a95eb6b18bdf89de078917abc63', '0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e');
INSERT INTO "ll"."user" (name, cardstats, privkey, pubkey)
VALUES ('0x2191ef87e3',{'one': 3, 'two': 5}, '82d052c865f5763aad42add438569276c00d3d88a2d062d36b2bae914d58b8c8', '0x2191ef87e392377ec08e7c08eb105ef5448eced5');
INSERT INTO "ll"."user" (name, cardstats, privkey, pubkey)
VALUES ('0x0f4f2ac550',{'one': 3, 'two': 5}, 'aa3680d5d48a8283413f7a108367c7299ca73f553735860a87b08f39395618b7', '0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5');
INSERT INTO "ll"."user" (name, cardstats, privkey, pubkey)
VALUES ('0x6330a553fc',{'one': 3, 'two': 5}, '0f62d96d6675f32685bbdb8ac13cda7c23436f63efbb9d07700d8669ff12b7c4', '0x6330a553fc93768f612722bb8c2ec78ac90b3bbc');
INSERT INTO "ll"."user" (name, cardstats, privkey, pubkey)
VALUES ('0x5aeda56215',{'one': 3, 'two': 5}, '8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5', '0x5aeda56215b167893e80b4fe645ba6d5bab767de');

// CREATE KEYSPACE ll
//   WITH REPLICATION = {
//    'class' : 'SimpleStrategy',
//    'replication_factor' : 1
//   };

// User
// // primary key username varchar
// // cardstats map<Card.appName+Card.name,SolvedCount int>
//
// CREATE TABLE ll.user(
//    username varchar,
//    cardstats map<varchar,int>,
//    PRIMARY KEY (username)
//  );

// // UserCredentials
// // cluster by primary key username
// // saltedPW varchar?
// //
// // TODO

// // Card
// // cluster by primary key name varchar
// // correctAnswer int
// // answers map<varchar,varchar> // optional answers, otherwise randomly generated
//
// CREATE TABLE ll.card(
//   name varchar,
//   appName varchar,
//   cardstats map<varchar,int>,
//   PRIMARY KEY (name,appName)
// );

//UPDATE cycling.cyclist_teams SET teams[2006] = 'Team DSB - Ballast Nedam' WHERE id = 5b6962dd-3f90-4c93-8f61-eabfa4a803e2;
