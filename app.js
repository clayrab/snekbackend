//import fetch from 'node-fetch';
var express = require('express');
var fetch = require("node-fetch");
// var path = require('path');
//var favicon = require('serve-favicon');
//var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser'); //required for passport
//var mongoose = require('mongoose');
// var fetch = require("node-fetch");

// global.fetch = require("node-fetch");
var jwt = require('jsonwebtoken');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var JwtStrategy = require('passport-jwt').Strategy;
var ExtractJwt = require('passport-jwt').ExtractJwt;
var models = require('./model.js').models;
var app = express();
app.use(passport.initialize());
// Needed for passport local strategy
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));

passport.use(new LocalStrategy({
    usernameField: 'user',
    passwordField: 'pw'
  },
  function(username, password, done) {
    console.log("password: " + password);
    console.log(done);
    models.instance.user.findOne({ name: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      // if (!user.validPassword(password)) {
      //   return done(null, false, { message: 'Incorrect password.' });
      // }
      if(password != "asdf") {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });

  }
));


// JWT configration
var jwtOptions = {}
//options.jwtFromRequest = ExtractJwt.fromAuthHeader();

//TODO: move this externally and change it
jwtOptions.secretOrKey = '7x0jhxt"9(thpX6'
//jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('JWT');
// Configure Passport to use JWT strategy to look up Users.
passport.use('jwt', new JwtStrategy(jwtOptions, function(jwt_payload, done) {
  console.log("jwt_payload");
  console.log(jwt_payload);
  console.warn(models);
  models.instance.user.findOne({
    name: jwt_payload.name
  }, function(err, user) {
    if (err) {
      return done(err, false);
    }
    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  })
}))

app.post('/login', function(req, res, next) {
  try {
    passport.authenticate('local', function(err, user, info) {
      if(err){
      }
      if(info){
        res.type('application/json');
        res.status(200);
        res.send(info);
      }
      if(user){
        var payload = {name: user.name};
        var token = jwt.sign(payload, jwtOptions.secretOrKey, {expiresIn: 86400 * 30});
        jwt.verify(token, jwtOptions.secretOrKey, function(err, data){
          console.log('err, data');
          console.log(err, data);
        });
        res.type('application/json');
        res.status(200);
        res.send({token: token});
      }
    })(req, res, next);
  } catch (err) {
    next(err);
  }
});

app.get('/secure', passport.authenticate('jwt', { session: false }),
  function(req, res) {
    res.send({ok: req.user});
  }
);

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

app.get('/makeUser', async (req, res, next) => {
  try {
    var john = new models.instance.user({
        name: "John",
        cardstats: {"three": 10}
    });
    var items = null;
    john.save(function(err){
      if(err) {
        console.log(err);
      } else {
        console.log("ok");
      }
      res.type('application/json');
      res.status(200);
      res.send(john);
    });
  } catch (err) {
    next(err);
  }
});

app.get('/getUser', async (req, res, next) => {
  try {
    models.instance.user.findOne({name: 'John'}, function(err, user){
      if(err) throw err;
      //The variable `john` is a model instance containing the person named `John`
      //`john` will be undefined if no person named `John` was found
      console.log('Found ', user.name);

      res.type('application/json');
      res.status(200);
      res.send(user);
    });
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
