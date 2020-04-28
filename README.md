Audio annotation
================

Annotate audio on the web. Collects transcripts and word onsets/offsets by annotating spectrograms.

Run `make start-redis` to get going with a local redis server (not the global one your machine might have).

Run `make start-server` to bring up the actual server.

![](https://raw.github.com/abarbu/audio-annotation/master/ui.jpg)

* Adding a movie

For example, say the movie is Venom.

You will need a `<movie-name>.wav` and as many `word-times-<annotatorName>.csv` as you
want, even zero. Where `<annotatorName>` is the name of an existing, possibly
noisy annotation of the movie. We use `rev.com` and sometimes `happyscribe` to
seed our annotations, this speeds users up a lot. The
`word-times-<annotatorName>.csv` file must have header `id,text,start,end`
(additional header entries are ignored).

The `generate(name,offset,segmentSize,onlyImages,maxOffset)` matlab script takes
as input the movie name, an offset into the movie in seconds, and how many
seconds long each segment should be. We run this twice, meaning that any 4
second segment starting at an even number-of-second start location is
available. The overlap helps eliminate issues with segment boundary
annotations. You can optionally regenerate only the images not the audio clips,
and end the generated data early (-1 will generate everything).

For example, for the movie venom and a reference annotation called rev where you
want 4 second segments, generating all segments that start at even times, you
would run:

```console
make install
mkdir -p movies/venom
cp venom.wav movies/venom/venom.wav
cp word-times.csv movies/venom/word-times.csv
matlab -nosplash -nodesktop -r "try, generate('venom',0,4,0,-1), catch e, disp(getReport(e)), exit(1), end, exit(0);"
matlab -nosplash -nodesktop -r "try, generate('venom',2,4,0,-1), catch e, disp(getReport(e)), exit(1), end, exit(0);"
node populate.js venom rev
echo 'ASECRET' > session-secret
echo 'BSECRET' > segment-key
```

If you only have an .avi or .mp4 file, ffmpeg will convert it to wav: `ffmpeg -i
venom.mp4 venom.wav`

The keys are only required for enabling access via google authentication and the
mturk API. Both of these are disabled by default. Make sure to change `ASECRET`
and `BSECRET` above to any string that you want!

You should now have a file called `segments` that contains venom segments,
`public/words` should contain files related to venom, as should `public/spectrograms`
(both a png and a jpg for each segment), and `public/audio-clips`.

To start the server in one terminal run `make start-redis` and in another one
`make start-server` Annotations will be stored in `dump.rdb` in the current
directory. If you want to avoid using redis to post-process the data, convert
the dump file to a json file with rdb. `pip install rdbtools python-lzf`
followed by `rdb --command json dump.rdb > dump.json`

http://victoria.csail.mit.edu:3000/gui.html?segment=venom:00162:00166&references=rev%2Chappyscribe&defaultReference=rev&worker=andrei
brings up the GUI for Venom at second 162. Depending on what parameters you
generate spectrograms with, you will have segments of different sizes. The above
command generated 4 second long segments: the end must be at 166. You can run
the generate command multiple times. It will look for reference annotations from
rev and happyscribe (%2C is an URL-encoded comma). You can add as many
references as you want, even using this to view or seed with the work of other
workers. rev is the default annotation here loaded in as a reference for each
segment if it exists. The worker name is at the end.
