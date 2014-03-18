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

var config = {
    // sandbox: https://mechanicalturk.sandbox.amazonaws.com
    // real: https://mechanicalturk.amazonaws.com
    url: "https://mechanicalturk.sandbox.amazonaws.com",
    receptor: { port: 8080, host: undefined },
    poller: { frequency_ms: 10000 },
    accessKeyId: fs.readFileSync('access-key', 'ascii'),
    secretAccessKey: fs.readFileSync('secret-key', 'ascii')
};
var mturk = require('mturk')(config);

function encrypt(key, s) {
    var c = crypto.createCipher('aes-128-cbc', key)
    var s = c.update(new Buffer(s, 'ascii').toString('base64'), 'base64', 'hex')
    s += c.final('hex')
    return s
}

function decrypt(key, s) {
    var d = crypto.createDecipher('aes-128-cbc', key)
    var r = d.update(s, 'hex', 'base64')
    r += d.final('base64')
    return new Buffer(r, 'base64').toString('ascii')
}

function submissionToken(segment, id) {
    var s = encrypt(segmentKey, segment+id)
    return s.substring(s.length-2, s.length)
}

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

var crypto = require('crypto')
var segmentKey = fs.readFileSync('segment-key', 'ascii')

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

app.get('/annotations', ensureAdmin, function(req, res) {  
    res.contentType('json');
    client.lrange("home-alone-2:annotations:v1", 0, -1,
                  function (err, replies) {
                      res.contentType('json');
                      res.send(replies);
                  })
});

app.get("/admin", ensureAdmin, function(req,res){res.redirect('/private/admin.html')})
app.get("/private/*", ensureAdmin, function(req,res){res.sendfile(__dirname + req.path)})

app.get("/annotation-list", function(req,res){
    res.contentType('json');
    var segments = fs.readFileSync('segments', 'ascii').split('\n')
    var id = microtime.nowDouble()
    res.send(_.map(segments,
                   function(segment) {
                       var token = encrypt(segmentKey,
                                           JSON.stringify({segment: segment,
                                                           id: id}))
                       client.sadd("all-segments", segment)
                       return {id: id,
                               segment: segment,
                               token: token,
                               stoken: submissionToken(segment, id)}}))
})

// Public API

app.post("/annotations-for-annotator", function(req,res){
    res.contentType('json');
    client.smembers(
        "all-segments",
        function (err, segments) {
            client.smembers(
                'user:' + req.body.id,
                function (err, annotated) {
                    res.send({segments: segments, annotated: annotated})                    
                })})})

app.post('/submission', function(req, res) {
    req.body.receivedAt = microtime.nowDouble()
    req.body.stoken = submissionToken(req.body.segment, req.body.id)
    console.log(req.body)
    var s = JSON.stringify(req.body)
    client.lpush("home-alone-2:annotations:v1", JSON.stringify(req.body))
    client.lpush('segment:' + req.body.segment, JSON.stringify(req.body))
    client.sadd("all-segments", req.body.segment)
    client.sadd('user:' + req.body.id, req.body.segment)
    client.sadd("all-ids", req.body.id)
    res.contentType('json')
    res.send({ response: "ok",
               stoken: (req.body.token?req.body.stoken:null) });
})

// TODO This really should sign & verify rather than just encrypt
app.post('/details', function(req, res) {
    res.contentType('json');
    var token;
    try {
        var token = JSON.parse(decrypt(segmentKey, req.body.token))
        if(token != null && token.segment != null && token.id != null) {
            res.send({ response: 'ok',
                       segment: token.segment,
                       id: token.id});
        } else throw 'token'
    }  catch(e) {
        res.send({ response: 'badtoken' });
    }
})

app.listen(process.env.PORT || 3000);

app.use(express.errorHandler());
