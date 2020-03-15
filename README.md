Audio annotation
====

Annotate audio on the web. Collects transcripts and word onsets/offsets by annotating spectrograms.
Just type 'make' to install and start, runs on port 3000.

![](https://raw.github.com/abarbu/audio-annotation/master/ui.jpg)

* Adding a movie

For example, say the movie is Venom.

You will need a `venom.wav` and a `word-times.csv` file.  The `word-times.csv`
file must have header
`id,text,start,end,speaker,sentence,pos,sentence_onset,sentence_offset`

The `generate` matlab script takes as input the movie name, an offset into the
movie in seconds, and how many seconds long each segment should be.

```console
make install
mkdir -p movies/venom
cp venom.wav movies/venom/venom.wav
cp word-times.csv movies/venom/word-times.csv
matlab -nodisplay -nojvm -nosplash -nodesktop -r "try, generate('venom',0,4), catch e, disp(getReport(e)), exit(1), end, exit(0);"
node preprocess.js venom
echo 'ASECRET' > session-secret
```

The keys are only required for enabling access via google authentication and the
mturk API. Both of these are disabled by default. Make sure to change `ASECRET`
above to any string that you want!

You should now have a file called `segments` that contains venom segments,
`public/words` should contain files related to venom, as should `public/spectrograms`
(both a png and a jpg for each segment), and `public/audio-clips`.

To start the server in one terminal run `make start-redis` and in another one
`make start-server` Annotations will be stored in `dump.rdb` in the current
directory. If you want to avoid using redis to post-process the data, convert
the dump file to a json file with rdb. `pip install rdbtools python-lzf`
followed by `rdb --command json /var/redis/6379/dump.rdb > dump.json`

http://localhost:3000/annotations?movie=venom will have all annotations related
to venom. 

http://localhost:3000/gui.html?segment=venom:01752:01756&id=1
annotations one segment starting at second 1752 until second 1756.

http://localhost:3000/gui.html?segment=venom:01752:01756&id=1&notranscript=1
annotations one segment starting at second 1752 until second 1756. As above but
skips the transcript step.
