const fs = require('fs')
const _ = require('lodash')
const microtime = require('microtime')
const express = require('express')
const compression = require('compression')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const errorhandler = require('errorhandler')
const cryptoapi = require('crypto')
const child_process = require('child_process')
const redis = require('redis')
const { promisify } = require('util')
const url = require('url');
const path = require('path');

const app = express()
app.use(compression())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded())
app.use(cookieParser())

app.use(session({ secret: fs.readFileSync('session-secret', 'ascii') }))

app.use(function(req, res, next) {
    if (req.get('Origin')) {
        const url = new URL(req.get('Origin'))
        if (url.hostname == 'localhost') {
            res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
            res.header('Access-Control-Expose-Headers', 'Content-Length');
            res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
        }
    }
    if (req.method === 'OPTIONS') {
        return res.send(200);
    } else {
        return next();
    }
});

function guiRevisionSync() {
    if (0)                       // TODO Reenable and reimplement me inreact
        return _.split(child_process.execSync('md5sum <<< $(find src -name \*.tsx -exec md5sum {} +)').toString(), ' ')[0]
    return ''
}

let guiRevision = guiRevisionSync()
fs.watchFile('src/',
    {
        bigint: false,
        persistent: true,
        interval: 5000
    },
    (curr, prev) => {
        guiRevision = guiRevisionSync()
        console.log('Code change')
        console.log(guiRevision)
    })

if (!fs.existsSync('session-secret'))
    fs.writeFileSync('session-secret', Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15))

if (!fs.existsSync('google-client-id') || !fs.existsSync('google-client-secret')) {
    console.log('Google auth id or secret missing; authentication will fail!')
}

if (!fs.existsSync('segment-key'))
    fs.writeFileSync('segment-key', Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15))

const segmentKey = fs.readFileSync('segment-key', 'ascii')

const encrypt = (key, s) => {
    var c = cryptoapi.createCipher('aes-128-cbc', key)
    s = c.update(new Buffer(s, 'ascii').toString('base64'), 'base64', 'hex')
    s += c.final('hex')
    return s
}

const decrypt = (key, s) => {
    var d = cryptoapi.createDecipher('aes-128-cbc', key)
    var r = d.update(s, 'hex', 'base64')
    r += d.final('base64')
    return new Buffer(r, 'base64').toString('ascii')
}

const submissionToken = (segment, id) => {
    const s = encrypt(segmentKey, segment + id)
    return s.substring(s.length - 2, s.length)
}

const ensureAdmin = (req, res, next) => {
    return next()
}


var client = redis.createClient(6399)

// TODO Ressurect me
// app.get('/list-annotations', ensureAdmin, (req, res) => {
//     if (req.query.movie) {
//         client.lrange('movie:annotations:v3:' + req.query.movie, 0, -1, (err, replies) => {
//             res.contentType('json')
//             res.send(replies)
//         })
//     } else {
//         res.send('Add a ?movie= parameter with the movie name.')
//     }
// })

// TODO Ressurect me
// app.get('/api/admin', ensureAdmin, (req, res) => {
//     res.redirect('/private/admin.html')
// })
// app.get('/api/private/*', ensureAdmin, (req, res) => {
//     res.sendfile(__dirname + req.path)
// })

// Public API

app.post('/api/segments-for-annotator', (req, res) => {
    res.contentType('json')
    client.smembers('all:segments', (err, segments) => {
        client.smembers('user:annotations:v3:' + req.body.worker, (err, annotated) => {
            res.send({ segments: segments, annotated: annotated })
        })
    })
})

const redisClient_zrem = promisify(client.zrem).bind(client)

app.post('/api/submission', async (req, res) => {
    req.body.receivedAt = microtime.nowDouble()
    req.body.ip = req.ip
    req.body.stoken = submissionToken(req.body.segment, req.body.worker)
    console.log('RECEIVE')
    console.log(req.body)
    const movieName = _.split(req.body.segment, ':')[0]
    client.zrangebyscore(
        'movie:annotations:v3:' + movieName + ':' + req.body.worker,
        req.body.start - 4,
        req.body.start,
        redis.print)
    client.zrangebyscore(
        'movie:annotations:v3:' + movieName + ':' + req.body.worker,
        req.body.start - 4,
        req.body.start,
        async (err, anns_) => {
            for (const ann of _.filter(_.map(anns_, ann => [ann, JSON.parse(ann)]),
                ann => ann[1].endTime >= req.body.start)) {
                const r = await redisClient_zrem('movie:annotations:v3:' + movieName + ':' + req.body.worker,
                    ann[1].startTime,
                    ann[0])
            }
            client.zremrangebyscore(
                'movie:annotations:v3:' + movieName + ':' + req.body.worker,
                req.body.start,
                req.body.end,
                () => {
                    _.map(req.body.annotations, a => {
                        const json = JSON.stringify(a)
                        client.zadd('movie:annotations:v3:' + movieName + ':' + req.body.worker, a.startTime, json)
                        client.zadd('movie:all-annotations:v3:' + movieName, a.startTime, json)
                        client.zadd('user:annotations:v3:' + ':' + req.body.worker, a.startTime, json)
                        client.sadd('all:annotations', json)
                    })
                    client.sadd('all:segments', req.body.segment)
                    client.sadd('all:movies', movieName)
                    client.sadd('all:workers', req.body.worker)
                    res.contentType('json')
                    res.send({
                        response: 'ok',
                        stoken: req.body.token ? req.body.stoken : null,
                    })
                }
            )
        })
})

const redisClient_zrangebyscore = promisify(client.zrangebyscore).bind(client)

app.get('/api/annotations', ensureAdmin, async (req, res) => {
    console.log('ANNOTATIONS')
    console.log(req.query)
    let allAnnotations = {}
    if (
        _.has(req.query, 'movieName') &&
        _.has(req.query, 'workers') &&
        _.has(req.query, 'startS') &&
        _.has(req.query, 'endS')
    ) {
        for (const worker of req.query['workers']) {
            const replies = await redisClient_zrangebyscore(
                'movie:annotations:v3:' + req.query.movieName + ':' + worker,
                req.query.startS,
                req.query.endS
            )
            allAnnotations[worker] = _.map(replies, JSON.parse)
        }
        res.contentType('json')
        res.send({ allAnnotations: allAnnotations, guiRevision: guiRevision })
    } else {
        res.status(400).send('Add movieName startS endS worker parameters')
    }
})

const redisClient_zrevrange = promisify(client.zrevrange).bind(client)

app.get('/api/last-annotation', ensureAdmin, async (req, res) => {
    if (
        _.has(req.query, 'movieName') &&
        _.has(req.query, 'worker') &&
        _.has(req.query, 'startS') &&
        _.has(req.query, 'endS')
    ) {
        const replies = await redisClient_zrevrange(
            'movie:annotations:v3:' + req.query.movieName + ':' + req.query.worker,
            0,
            0
        )
        res.contentType('json')
        res.send(replies === [] ? false : JSON.parse(replies[0]))
    } else {
        res.status(400).send('Add movieName startS endS worker parameters')
    }
})

app.get('/api/movie-list', ensureAdmin, async (req, res) => {
    client.smembers('all:movies',
        (err, ans) => {
            console.log('movielist', ans)
            res.contentType('json')
            res.send(ans)
        })
})

app.get('/api/movies-for-worker', ensureAdmin, async (req, res) => {
    if (_.has(req.query, 'worker')) {
        client.keys('keys movie:annotations:v3:*:' + req.query['worker'],
            (err, ans) => {
                console.log(ans)
                res.contentType('json')
                res.send(JSON.parse(ans))
            })
    } else {
        res.status(400).send('Needs a worker')
    }
})

app.get('/api/worker-list', ensureAdmin, async (req, res) => {
    client.smembers('all:workers',
        (err, ans) => {
            console.log('workerlist', ans)
            res.contentType('json')
            res.send(ans)
        })
})

app.get('/api/workers-for-movie', ensureAdmin, async (req, res) => {
    if (_.has(req.query, 'movie')) {
        client.keys('movie:annotations:v3:' + req.query['movie'] + ':*',
            (err, ans) => {
                res.contentType('json')
                res.send(_.map(ans, a => _.split(a, ':')[4]))
            })
    } else {
        res.status(400).send('Needs a movie')
    }
})

app.get('/api/save-db', ensureAdmin, async (req, res) => {
    client.bgsave((err, ans) => {
        console.log(ans)
        res.contentType('json')
        res.send({})
    })
})

app.get('/api/last-save-db-timestamp', ensureAdmin, async (req, res) => {
    client.lastsave((err, ans) => {
        console.log(ans)
        res.contentType('json')
        res.send(JSON.parse(ans))
    })
})

app.get('/api/prepare-db', ensureAdmin, async (req, res) => {
    child_process.exec('./db_dump.sh', { maxBuffer: 1024 * 50000 },
        (error, stdout, stderr) => {
            console.log('Response')
            console.log(stderr)
            console.log(error)
            res.contentType('application/json')
            res.send(stdout)
        })
})

app.get('/api/fetch-db', ensureAdmin, async (req, res) => {
    client.smembers('all:movies',
        (err, ans) => {
            child_process.exec('./db_dump.sh', { maxBuffer: 1024 * 50000 },
                (error, stdout, stderr) => {
                    console.log('Response')
                    console.log(stderr)
                    console.log(error)
                    if (error) {
                        res.status(500)
                        res.send(error)
                    } else {
                        res.contentType('application/json')
                        res.setHeader('Content-Disposition', `attachment; filename="db-export-${new Date().toISOString()}.json"`);
                        res.send(stdout)
                    }
                })
        })
})

// TODO This really should sign & verify rather than just encrypt
app.post('/api/details', (req, res) => {
    res.contentType('json')
    try {
        const token = JSON.parse(decrypt(segmentKey, req.body.token))
        if (token !== null && token.segment !== null && token.id !== null) {
            res.send({ response: 'ok', segment: token.segment, id: token.id })
        } else throw 'token'
    } catch (e) {
        res.send({ response: 'badtoken' })
    }
})

app.get('/audio-ui', function(req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/export', function(req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/status', function(req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.use('/api/static/', express.static(__dirname + '/static'))
app.get('*', express.static(__dirname + '/build/'))

app.listen(process.env.PORT || 4001)

app.use(errorhandler())
