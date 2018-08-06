
// CREATE KEYSPACE ll
//   WITH REPLICATION = {
//    'class' : 'SimpleStrategy',
//    'replication_factor' : 1
//   };

// User
// // primary key username varchar
// // cardstats map<Card.appName+Card.name,SolvedCount int>
//
 CREATE TABLE ll.user(
   username varchar,
   cardstats map<varchar,int>,
   PRIMARY KEY (username)
 );

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

// In application, keep all cards in lazy-cached memory
// When "drawing" cards for a user, read their cardstats and compute the {AllCards}-{SolvedCards}+{FreshSolvedCards}
// Cards are 'refreshened' based on the core exponential(log) algorithm.

INSERT INTO "ll"."user" (username, cardstats)
VALUES ('bob',{'one': 3, 'two': 5});

//UPDATE cycling.cyclist_teams SET teams[2006] = 'Team DSB - Ballast Nedam' WHERE id = 5b6962dd-3f90-4c93-8f61-eabfa4a803e2;
