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

fs.mkdirSync('telemetry', {recursive: true})

app.post('/telemetry', (req, res) => {
    console.log('Receive')
    console.log(req.body.worker)
    console.log(req.ip)
    req.body.receivedAt = microtime.nowDouble()
    req.body.ip = req.ip
    const movieName = _.split(req.body.segment, ':')[0]
    fs.appendFile('telemetry/' + req.body.worker, JSON.stringify(req.body) + '\n', () => 0)
    res.end()
})

app.listen(process.env.PORT || 3001)

app.use(errorhandler())
