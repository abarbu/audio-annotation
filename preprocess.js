const csv = require('csv-parser');
const fs = require('fs');
var _ = require('lodash');
const { exec, execSync } = require("child_process");

if(process.argv[2]) {
    movieName = process.argv[2]
} else {
    console.log("Pass one argument, the movie name");
}

allWords = [];

fs.createReadStream('movies/' + movieName + '/word-times.csv')
  .pipe(csv())
    .on('data', (row) => {
        row.start = row.start/1000;
        row.end = row.end/1000;
        allWords.push(row);
  })
  .on('end', () => {
      console.log('CSV read');
      console.log(allWords);
      segments = [];
      _.forEach(fs.readdirSync('public/spectrograms/'), item => {
          if(_.startsWith(item, movieName) && _.endsWith(item, ".png")) {
          segments.push(_.tail(_.split(_.split(item, '.')[0], ':')));
      } });
      execSync("rm -f public/words/" + movieName + "*");
      _.forEach(segments,
                segment => {
                    start = segment[0]; // seconds
                    end = segment[1];
                    segmentName = movieName + ':' + segment[0] + ':' + segment[1]
                    words = _.uniq(_.map(_.filter(allWords, word => word.start >= start && word.end <= end),
                                         word => word.sentence));
                    fs.writeFileSync('public/words/' + segmentName + '.words',
                                     _.join(words, ' '));
                    fs.appendFileSync('segments', segmentName + '\n');
                });
      exec("sort -u segments -o segments", (error, stdout, stderr) => {
          if (error) {
              console.log(`error: ${error.message}`);
              return;
          }
          if (stderr) {
              console.log(`stderr: ${stderr}`);
              return;
          }
          console.log(`stdout: ${stdout}`);
      });
  });
