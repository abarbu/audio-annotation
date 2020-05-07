const fs = require('fs')
const _ = require('lodash')

const redis = require('redis')
const { promisify } = require('util')
var client = redis.createClient(6399)

const microtime = require('microtime')
const express = require('express')
const compression = require('compression')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const errorhandler = require('errorhandler')
const crypto = require('crypto')

const app = express()
app.use(compression())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded())
app.use(cookieParser())
app.use(session({ secret: fs.readFileSync('session-secret', 'ascii') }))
app.use(express.static(__dirname + '/public'))

if (!fs.existsSync('google-client-id') || !fs.existsSync('google-client-secret')) {
  console.log('Google auth id or secret missing; authentication will fail!')
}

const segmentKey = fs.readFileSync('segment-key', 'ascii')

const encrypt = (key, s) => {
  var c = crypto.createCipher('aes-128-cbc', key)
  s = c.update(new Buffer(s, 'ascii').toString('base64'), 'base64', 'hex')
  s += c.final('hex')
  return s
}

const decrypt = (key, s) => {
  var d = crypto.createDecipher('aes-128-cbc', key)
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

app.get('/list-annotations', ensureAdmin, (req, res) => {
  if (req.query.movie) {
    client.lrange('movie:annotations:v3:' + req.query.movie, 0, -1, (err, replies) => {
      res.contentType('json')
      res.send(replies)
    })
  } else {
    res.send('Add a ?movie= parameter with the movie name.')
  }
})

app.get('/admin', ensureAdmin, (req, res) => {
  res.redirect('/private/admin.html')
})
app.get('/private/*', ensureAdmin, (req, res) => {
  res.sendfile(__dirname + req.path)
})

// Public API

app.post('/segments-for-annotator', (req, res) => {
  res.contentType('json')
  client.smembers('all:segments', (err, segments) => {
    client.smembers('user:annotations:v3:' + req.body.worker, (err, annotated) => {
      res.send({ segments: segments, annotated: annotated })
    })
  })
})

const redisClient_zrem = promisify(client.zrem).bind(client)

app.post('/submission', async (req, res) => {
    req.body.receivedAt = microtime.nowDouble()
    req.body.ip = req.ip
    req.body.stoken = submissionToken(req.body.segment, req.body.worker)
    console.log('RECEIVE')
    console.log(req.body)
    const movieName = _.split(req.body.segment, ':')[0]
    client.zrangebyscore(
        'movie:annotations:v3:' + movieName + ':' + req.body.worker,
        req.body.start-4,
        req.body.start,
        redis.print)
    client.zrangebyscore(
        'movie:annotations:v3:' + movieName + ':' + req.body.worker,
        req.body.start-4,
        req.body.start,
        async (err, anns_) => {
            for(const ann of _.filter(_.map(anns_, ann => [ann, JSON.parse(ann)]),
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

app.get('/annotations', ensureAdmin, async (req, res) => {
    var allReplies = []
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
            allReplies.push({
                worker: worker,
                annotations: _.map(replies, JSON.parse),
            })
        }
        res.contentType('json')
        res.send(allReplies)
    } else {
        res.status(400).send('Add movieName startS endS worker parameters')
    }
})

const redisClient_zrevrange = promisify(client.zrevrange).bind(client)

app.get('/last-annotation', ensureAdmin, async (req, res) => {
  var allReplies = []
  if (
    _.has(req.query, 'movieName') &&
    _.has(req.query, 'worker') &&
    _.has(req.query, 'startS') &&
    _.has(req.query, 'endS')
  ) {
    const worker = req.query['workers']
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

// TODO This really should sign & verify rather than just encrypt
app.post('/details', (req, res) => {
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

app.listen(process.env.PORT || 3000)

app.use(errorhandler())
