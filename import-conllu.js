const process = require('process')
const fs = require('fs')
var conllu = require('conllujs')
var _ = require('lodash')

var redis = require('redis'),
  client = redis.createClient(6399)

if (process.argv[4]) {
  movieName = process.argv[2]
  annotatorName = process.argv[3]
  filepath = process.argv[4]
} else {
  console.error('Pass two arguments: import-conllu.js movieName annotatorName filepath.conllu')
  process.exit(0)
}

c = new conllu.Conllu()
c.serial = fs.readFileSync(filepath, 'utf8')

function parseWord(sentence, token) {
  const t = _.split(token.misc, /\(|\)|:/)
  if (t.length > 2)
    return {
      startTime: parseFloat(t[1]),
      endTime: parseFloat(t[2]),
      word: token.form,
      sentId: parseInt(sentence.metadata[0].value),
      sentIndex: parseInt(token.id),
      tag: token.upostag,
    }
  return {
    word: token.form,
    sentId: parseInt(sentence.metadata[0].value),
    sentIndex: parseInt(token.id),
    tag: token.upostag,
  }
}

function closestTo(l, ref, fn) {
  return _.reduce(
    l,
    (best, e) => (best === null ? e : Math.abs(fn(e) - ref) < Math.abs(fn(best) - ref) ? e : best),
    null
  )
}

function closestToComp(l, ref, compFn) {
  return _.reduce(l, (best, e) => (best === null ? e : compFn(ref, best, e) ? e : best), null)
}

function cmpNearestTo(fn) {
  return (ref, best, n) => Math.abs(fn(ref) - fn(n)) < Math.abs(fn(ref) - fn(best))
}

const wordsWithTimes = []

_.forEach(c.sentences, s => {
  _.forEach(s.tokens, token => {
    const w = parseWord(s, token)
    if (w.startTime) wordsWithTimes.push(w)
  })
})

const contractions = ["'m", "n't", "'ve", "'re", "'s", "'ll", "'d"]

async function main() {
  await Promise.all(
    _.map(c.sentences, async s => {
      return await Promise.all(
        _.map(s.tokens, async (token, idx) => {
          const w = parseWord(s, token)
          if (token.upostag !== 'PUNCT' && !_.includes(contractions, token.form)) {
            if (s.tokens[idx + 1] && _.includes(contractions, s.tokens[idx + 1].form)) {
              w.word = w.word + s.tokens[idx + 1].form
            }
            if (!w.startTime) {
              w.word = w.word + '@'
              const closestSentId = closestToComp(
                wordsWithTimes,
                w,
                cmpNearestTo(x => x.sentId)
              ).sentId
              let closestWord
              if (closestSentId === w.sentId) {
                closestWord = closestToComp(
                  _.filter(wordsWithTimes, x => x.sentId === w.sentId),
                  w,
                  cmpNearestTo(x => x.sentIndex)
                )
              } else if (closestSentId < w.sentId) {
                closestWord = closestToComp(
                  _.filter(wordsWithTimes, x => x.sentId === closestSentId),
                  { sentIndex: Infinity },
                  cmpNearestTo(x => x.sentIndex)
                )
              } else {
                closestWord = closestToComp(
                  _.filter(wordsWithTimes, x => x.sentId === closestSentId),
                  { sentIndex: -Infinity },
                  cmpNearestTo(x => x.sentIndex)
                )
              }
              w.startTime = closestWord.startTime + 0.1
              w.endTime = closestWord.startTime + 0.3
            }
            await client.zadd(
              'movie:annotations:v3:' + movieName + ':' + annotatorName,
              w.startTime,
              JSON.stringify({
                startTime: w.startTime,
                endTime: w.endTime,
                word: w.word,
                sentId: w.sentId,
                sentIndex: w.sentIndex,
                tag: w.tag,
              })
            )
          }
        })
      )
    })
  )
  await client.quit()
}

main()
