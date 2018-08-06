//import fetch from 'node-fetch';
var express = require('express');
var fetch = require("node-fetch");
// var path = require('path');
//var favicon = require('serve-favicon');
//var logger = require('morgan');
var cookieParser = require('cookie-parser');
//var bodyParser = require('body-parser');
//var mongoose = require('mongoose');
// var fetch = require("node-fetch");

// global.fetch = require("node-fetch");
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var models = require('./model.js').models;
var app = express();

// JWT configration
var options = {}
//options.jwtFromRequest = ExtractJwt.fromAuthHeader();
options.secretOrKey = '7x0jhxt"9(thpX6'

app.use(passport.initialize());

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({
//   extended: false
// }));

app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));

// Configure Passport to use local strategy for initial authentication.
// passport.use('local', new LocalStrategy(User.authenticate()));

// Configure Passport to use JWT strategy to look up Users.
// passport.use('jwt', new JwtStrategy(options, function(jwt_payload, done) {
//   User.findOne({
//     _id: jwt_payload.id
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

// app.use('/', routes);
//app.use('/users', users);

app.get('/api/getnews', async (req, res, next) => {
  let items = null;
  try {
    const url = 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Freactjsnews.com%2Ffeed.xml';
    await fetch(url)
    .then(response => response.json())
    .then((data) => {
      if (data.status === 'ok') {
        items = data.items;
      }
    }).catch((err) => {
      throw err;
    });
    //res.type(text/html); res.status(200); res.send(<p>HELLO WORLD!);
    res.type('application/json');
    res.status(200);
    res.send(items);
  } catch (err) {
    next(err);
  }
});

app.get('/test', async (req, res, next) => {
  try {
    var john = new models.instance.user({
        name: "John",
        cardstats: {"three": 10}
    });
    var items = null;
    john.save(function(err){
      if(err) {
        console.log(err);
        items = {"err": "err"};
      } else {
        console.log('Yuppiie!');
        items = {"ok": "ok"};
      }
      res.type('application/json');
      res.status(200);
      res.send(john);
    });
    //items = {"ok": "ok"};
    console.log(items);
    //res.type(text/html); res.status(200); res.send(<p>HELLO WORLD!);
  } catch (err) {
    next(err);
  }
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.type('application/json');
  res.send({error: err.message});
  // res.render('error', {
  //   message: err.message,
  //   error: {}
  // });
});


app.listen(3001, () => console.log('Example app listening on port 3001!'))

module.exports = app;
