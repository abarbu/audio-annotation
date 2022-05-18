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

const wordsWithTimes = []

_.forEach(c.sentences, s => {
  _.forEach(s.tokens, token => {
    const w = parseWord(s, token)
    if (w.startTime) wordsWithTimes.push(w)
  })
})

const contractions = ["'m", "n't", "'ve", "'re", "'s", "'ll", "'d"]

async function main() {
  let lastStartTime = 0
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
              w.startTime = lastStartTime + 0.1
              w.endTime = lastStartTime + 0.3
            } else lastStartTime = w.startTime
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
