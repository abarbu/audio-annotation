var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var redis = require("redis"),
client = redis.createClient();
var microtime = require('microtime');
var express = require('express');
var app = express();
app.use(express.compress());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser());
app.use(express.session({ secret: fs.readFileSync('session-secret', 'ascii') }));
var passport = require('passport'), GoogleStrategy = require('passport-google').Strategy;
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));
app.use(app.router);

adminUsers = [{ displayName: 'Andrei Barbu',
                emails: [ { value: 'andrei@0xab.com' } ],
                name: { familyName: 'Barbu', givenName: 'Andrei' },
                identifier: 'https://www.google.com/accounts/o8/id?id=AItOawnK_8yl9ah_AZ_B8iJYvsnpiokwyYFbvOk' }]


passport.use(new GoogleStrategy({returnURL: 'http://localhost:3000/auth/google/return',
                                 realm: 'http://localhost:3000/'},
                                function(identifier, profile, done) {
                                    process.nextTick(function () {
                                        profile.identifier = identifier;
                                        console.log('user')
                                        console.log(profile)
                                        return done(null, profile);});}));

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login')
}

function isAdmin(req) {
    console.log("admin")
    console.log(_.map(adminUsers, function(user) { return user.identifier; }))
    console.log(req.user.identifier)
    return _.contains(_.map(adminUsers, function(user) { return user.identifier; }),
                      req.user.identifier);
}

// debug
// function ensureAdmin(req, res, next) {
//     if (req.isAuthenticated() && isAdmin(req)) { return next(); }
//     res.redirect('/login')
// }
function ensureAdmin(req, res, next) {return next();}

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


app.get('/auth/google', passport.authenticate('google'));

app.get('/auth/google/return', 
        passport.authenticate('google', { failureRedirect: '/login' }),
        function(req, res) { res.redirect('/admin'); });

app.get('/login', function(req, res) { res.redirect('/auth/google'); });

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

app.post('/submission', function(req, res) {
    req.body['receivedAt'] = microtime.nowDouble()
    client.lpush("home-alone-2:annotations:v1", JSON.stringify(req.body));
    console.log(req.body);
    res.contentType('json');
    res.send({ response: "ok" });
});

app.get('/annotations', ensureAdmin, function(req, res) {  
    res.contentType('json');
    client.lrange("home-alone-2:annotations:v1", 0, -1,
                  function (err, replies) {
                      res.contentType('json');
                      res.send(replies);
                  })
});

app.get("/admin", ensureAdmin, function(req,res){ res.redirect('/private/admin.html') })
app.get("/private/*", ensureAdmin, function(req,res){res.sendfile(__dirname + req.path);});

app.listen(process.env.PORT || 3000);

app.use(express.errorHandler());
