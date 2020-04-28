const process = require('process')
const csv = require('csv-parser')
const fs = require('fs')
var _ = require('lodash')
const { exec, execSync } = require('child_process')

var redis = require('redis'),
  client = redis.createClient(6399)

if (process.argv[3]) {
  movieName = process.argv[2]
  annotatorName = process.argv[3]
} else {
  console.log('Pass two arguments: populate.js movieName annotatorName')
}

allWords = []

fs.createReadStream('movies/' + movieName + '/word-times-' + annotatorName + '.csv')
  .pipe(csv())
  .on('data', (row) => {
    row.start = row.start / 1000
    row.end = row.end / 1000
    allWords.push(row)
  })
  .on('end', () => {
    console.log('CSV read')
    console.log(allWords)
    segments = []
    _.forEach(fs.readdirSync('public/spectrograms/'), (item) => {
      if (_.startsWith(item, movieName) && _.endsWith(item, '.png')) {
        segments.push(_.tail(_.split(_.split(item, '.')[0], ':')))
      }
    })
    _.forEach(segments, (segment) => {
      start = segment[0] // seconds
      end = segment[1]
      segmentName = movieName + ':' + segment[0] + ':' + segment[1]
      words = _.uniq(
        _.map(
          _.filter(allWords, (word) => word.start >= start && word.end <= end),
          (word) => word.sentence
        )
      )
      fs.writeFileSync('public/words/' + segmentName + '.words', _.join(words, ' '))
      fs.appendFileSync('segments', segmentName + '\n')
    })
    console.log('Redis')
    _.forEach(allWords, (word) =>
      client.zadd(
        'movie:annotations:v3:' + movieName + ':rev',
        word.start,
        JSON.stringify({ startTime: word.start, endTime: word.end, word: word.text })
      )
    )
    console.log('Finished uploading to redis')
    process.exit(0)
  })
