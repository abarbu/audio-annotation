"""Toolkit for importing, exporting and manipulating audio-gui annotations.

Usage:
  toolkit.py import-movie <file-path> <movie-name>
  toolkit.py import-annotation <file-path> <movie-name> <annotator-name>
  toolkit.py process-movie [--no-audio] [--no-spectrograms] [--movie-start=<movie-start-seconds>] [--movie-end=<movie-end-seconds>] <movie-name> <segment-length-seconds>
  toolkit.py process-annotation <movie-name> <annotator-name>
  toolkit.py export-all-annotations
  toolkit.py (-h | --help)
  toolkit.py --version

Options:
  -h --help                           Show this screen.
  --version                           Show version.
  --no-audio                          Don't generate the audio files
  --no-spectrograms                   Dont't generate spectrogram images
  --movie-start=<movie-start>         Offset into the movie
  --segment-length=<segment-length>   The length of each segment
  --movie-end=<movie-end>             If you want to process only part of the movie
"""

import numpy
import math
import pylab
import wave
import array
import os
from docopt import docopt

if __name__ == '__main__':
    arguments = docopt(__doc__, version='Toolkit')
    print(arguments)

def segmentName(start, size):
    return '%s:%05d:%05d' % (arguments['<movie-name>'], start, start+size)

#  toolkit.py import-movie <file-path> <movie-name>
if arguments['import-movie']:
    os.system('mkdir -p movies/%s' % arguments['<movie-name>'])
    os.system('ffmpeg -y -i %s -ac 2 movies/%s/%s.wav' % (arguments['<file-path>'], arguments['<movie-name>'], arguments['<movie-name>']))

#  toolkit.py import-annotation <file-path> <movie-name> <annotator-name>
if arguments['import-annotation']:
    os.system('mkdir -p movies/%s' % arguments['<movie-name>'])
    os.system('cp %s movies/%s/word-times-%s.csv' % (arguments['<file-path>'],
                                                     arguments['<movie-name>'],
                                                     arguments['<annotator-name>']))

#  toolkit.py process-movie [--no-audio] [--no-spectrograms] [--movie-start=<movie-start-seconds>] [--movie-end=<movie-end-seconds>] <movie-name> <segment-length-seconds>
if arguments['process-movie']:
    wavein = wave.open('movies/%s/%s.wav' % (arguments['<movie-name>'], arguments['<movie-name>']), 'rb')
    os.system('mkdir -p public/spectrograms/%s' % arguments['<movie-name>'])
    os.system('mkdir -p public/audio-clips/%s' % arguments['<movie-name>'])
    movieStart = 0 if arguments['--movie-start'] is None else int(arguments['--movie-start'])
    end = math.floor(wavein.getnframes()/wavein.getframerate()) if arguments['--movie-end'] is None else int(arguments['--movie-end'])
    step = int(arguments['<segment-length-seconds>'])
    finalStart = list(range(movieStart, end, step))[-1]
    wavein.setpos(movieStart*wavein.getframerate())
    for start in range(movieStart, end, step):
        print('%d/%d %f%%' % (start, finalStart, 100*start/finalStart))
        audioData = numpy.array(array.array('h', wavein.readframes(step*wavein.getframerate())))
        if not arguments['--no-spectrograms']:
            fig = pylab.figure(figsize=(20,5))
            spectrum, freqs, t, im = pylab.specgram(audioData/numpy.abs(audioData).mean(),
                           NFFT=2*1024, Fs=wavein.getframerate(),
                           noverlap=2*768, window=pylab.window_hanning, scale_by_freq=True,
                           vmin=-60, vmax=-5,
                           cmap=pylab.get_cmap('gist_gray'))  # cividis gist_gray cubehelix Greys
            pylab.ylim(100,3500)
            pylab.axis('off')
            pylab.gca().xaxis.set_major_locator(pylab.NullLocator())
            pylab.gca().yaxis.set_major_locator(pylab.NullLocator())
            pylab.savefig('public/spectrograms/%s/%s.jpg' % (arguments['<movie-name>'], segmentName(start, step)),
                          bbox_inches='tight', pad_inches=0, dpi=100)
            pylab.close()
            os.system('jpegoptim -tsv -S50 public/spectrograms/%s/%s.jpg' % (arguments['<movie-name>'], segmentName(start, step)))
        if not arguments['--no-audio']:
            waveout = wave.open('public/audio-clips/%s/%s.wav' % (arguments['<movie-name>'], segmentName(start, step)), 'wb')
            waveout.setparams(wavein.getparams())
            waveout.writeframes(audioData)
            waveout.close()
            os.system('ffmpeg -hide_banner -loglevel panic -y -i file:public/audio-clips/%s/%s.wav file:public/audio-clips/%s/%s.mp3'
                      % (arguments['<movie-name>'], segmentName(start, step), arguments['<movie-name>'], segmentName(start, step)), 'wb')
            os.system('ffmpeg -hide_banner -loglevel panic -y -i file:public/audio-clips/{0}/{1}.mp3 -filter:a "atempo=0.5" -vn file:public/audio-clips/{0}/{1}-0.5.mp3 > /dev/null'
                      # Could do: asetrate=44000*0.5,aresample=44000,
                      .format(arguments['<movie-name>'], segmentName(start, step)))

#  toolkit.py process-annotation <movie-name> <annotator-name>
if arguments['process-annotation']:
    os.system('node populate.js %s %s' % (arguments['<movie-name>'], arguments['<annotator-name>']))

#  toolkit.py export-all-annotations
if arguments['export-all-annotations']:
    os.system('pip install rdbtools python-lzf')
    os.system('rdb --command json dump.rdb > dump.json')
