var fs = require('fs');
var path = require('path');
var _ = require('lodash');

var redis = require('redis'),
client = redis.createClient(6399);

var microtime = require('microtime');
var express = require('express');
var compression = require('compression');
var morgan = require('morgan')
var cookieParser = require('cookie-parser')
var session = require('express-session')
var errorhandler = require('errorhandler')

var app = express();
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
app.use(session({ secret: fs.readFileSync('session-secret', 'ascii') }));

var passport = require('passport'), GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/public'));

var config = {
    url: 'https://mechanicalturk.sandbox.amazonaws.com',
    receptor: { port: 8080, host: undefined },
    poller: { frequency_ms: 10000 },
    googleClientId: fs.existsSync('google-client-id') ? fs.readFileSync('google-client-id', 'ascii') : 'dummyID',
    googleClientSecret: fs.existsSync('google-client-secret') ? fs.readFileSync('google-client-secret', 'ascii') : 'dummySecret',
};

if(!fs.existsSync('google-client-id') || !fs.existsSync('google-client-secret')) {
    console.log('Google auth id or secret missing; authentication will fail!')
}

var turkConfig = {
    // NB Sandbox
    sanbox: true,
    access: fs.existsSync('access-key') ? fs.readFileSync('access-key', 'ascii') : 'dummyMTurkAccess',
    secret: fs.existsSync('secret-key') ? fs.readFileSync('secret-key', 'ascii') : 'dummyMTurkSecret',
};
var mturk = require('api-mturk');

if(!fs.existsSync('access-key') || !fs.existsSync('secret-key')) {
    console.log('MTurk key or secret missing; the MTurk API will fail!')
}

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
                id: '103086825977904293517' }]

passport.use(new GoogleStrategy({callbackURL: 'http://localhost:3000/auth/google/callback',
                                 clientID: config.googleClientId,
                                 clientSecret: config.googleClientSecret,
                                 scope: 'email'},
                                function(accessToken, refreshToken, profile, done) {
                                    process.nextTick(function () {
                                        console.log('user')
                                        console.log(profile)
                                        return done(null, profile);});}));

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login')
}

function isAdmin(req) {
    return _.includes(_.map(adminUsers, function(user) { return user.id; }),
                      req.user.id);
}

// Enable this to get authentication!
// function ensureAdmin(req, res, next) {
//      if (req.isAuthenticated() && isAdmin(req)) { return next(); }
//      res.redirect('/login')
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

app.get('/auth/google/callback', 
        passport.authenticate('google', { failureRedirect: '/login' }),
        function(req, res) { res.redirect('/admin'); });

app.get('/login', function(req, res) { res.redirect('/auth/google'); });

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

app.get('/list-annotations', ensureAdmin, function(req, res) {  
    if(req.query.movie) {
        client.lrange('movie:annotations:v3:'+req.query.movie, 0, -1,
                      function (err, replies) {
                          res.contentType('json');
                          res.send(replies);
                      })
    } else {
        res.send('Add a ?movie= parameter with the movie name.');
    }
});

app.get('/admin', ensureAdmin, function(req,res){res.redirect('/private/admin.html')})
app.get('/private/*', ensureAdmin, function(req,res){res.sendfile(__dirname + req.path)})

// TODO Update me to 'worker' instead of segment 'id'
// app.get('/segment-list', function(req,res){
//     res.contentType('json');
//     var segments = fs.readFileSync('segments', 'ascii').split('\n')
//     res.send(_.map(segments,
//                    function(segment, i) {
//                        var id = microtime.nowDouble()
//                        var token = encrypt(segmentKey,
//                                            JSON.stringify({segment: segment,
//                                                            id: id}))
//                        client.sadd('all:segments', segment)
//                        return {id: id,
//                                segment: segment,
//                                token: token,
//                                stoken: submissionToken(segment, id)}}))})

// Public API

app.post('/segments-for-annotator', function(req,res){
    res.contentType('json');
    client.smembers(
        'all:segments',
        function (err, segments) {
            client.smembers(
                'user:annotations:v3:' + req.body.worker,
                function (err, annotated) {
                    res.send({segments: segments, annotated: annotated})
                })})})

app.post('/submission', function(req, res) {
    req.body.receivedAt = microtime.nowDouble()
    req.body.stoken = submissionToken(req.body.segment, req.body.worker)
    console.log(req.body)
    var s = JSON.stringify(req.body)
    movieName = _.split(req.body.segment, ':')[0];
      client.zremrangebyscore('movie:annotations:v3:'+movieName+':'+req.body.worker,
                            req.body.start,
                            req.body.end,
                            function(err, replies) {
                                _.map(req.body.annotations,
                                      function(a) {
                                          const json = JSON.stringify(a);
                                          client.zadd('movie:annotations:v3:'+movieName+':'+req.body.worker, a.startTime, json);
                                          client.zadd('movie:all-annotations:v3:'+movieName, a.startTime, json);
                                          client.zadd('user:annotations:v3:'+':'+req.body.worker, a.startTime, json);
                                          client.sadd('all:annotations', json);
                                      },
                                     );
                                client.sadd('all:segments', req.body.segment);
                                client.sadd('all:movies', movieName);
                                client.sadd('all:workers', req.body.worker);
                                res.contentType('json')
                                res.send({ response: 'ok',
                                           stoken: (req.body.token?req.body.stoken:null) });
                            });
})

app.get('/annotations', ensureAdmin, async (req, res) => {
    if(_.has(req.query, 'movieName') && (_.has(req.query, 'worker') || _.has(req.query, 'workers'))
       && _.has(req.query, 'startS') && _.has(req.query, 'endS')) {
        console.log('movie:annotations:v3:'+req.query.movieName+':'+req.query.worker);
        client.zrangebyscore('movie:annotations:v3:'+req.query.movieName+':'+req.query.worker,
                             req.query.startS, req.query.endS,
                             function (err, replies) {
                                 res.contentType('json');
                                 res.send(replies == [] ? undefined : _.map(replies, JSON.parse));
                             })
    } else {
        res.status(400).send('Add movieName startS endS worker parameters');
    }
});

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

app.use(errorhandler());
