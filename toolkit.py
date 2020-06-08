#!/usr/bin/env python
"""Toolkit for importing, exporting and manipulating audio-gui annotations.

Usage:
  toolkit.py import-movie <file-path> <movie-name>
  toolkit.py import-annotation <file-path> <movie-name> <annotator-name>
  toolkit.py process-movie [--movie-start=<movie-start-seconds>] [--movie-end=<movie-end-seconds>] <movie-name> <segment-length-seconds>
  toolkit.py process-annotation <movie-name> <annotator-name>
  toolkit.py export-all-annotations
  toolkit.py (-h | --help)
  toolkit.py --version

Options:
  -h --help                           Show this screen.
  --version                           Show version.
  --movie-start=<movie-start>         Offset into the movie
  --segment-length=<segment-length>   The length of each segment
  --movie-end=<movie-end>             If you want to process only part of the movie
"""

import numpy
import math
import matplotlib
matplotlib.use('Agg') # No pictures displayed 
import pylab
import scipy
import librosa
import librosa.display
import numpy as np
import array
import os
import progressbar
import wave
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

def saveSpectrogram(signal, save_path, n_fft=512, hop_length=128, to_db_scale=False, n_mels=128,
                    mel_scale=False, top_db=80, show_shape=False, cmap='gist_gray'):
    stft = librosa.stft(signal, n_fft, hop_length)
    real_portion = abs(stft)**1.3
    if(mel_scale):   real_portion = librosa.feature.melspectrogram(S=real_portion**2, sr=fs, n_fft=n_fft, n_mels=n_mels, fmin=27, fmax=5000)
    if(to_db_scale): real_portion = librosa.amplitude_to_db(real_portion, top_db, amin=0.0001)
    if(show_shape):  print("Shape: {}x{}".format(*real_portion.shape))
    fig = pylab.figure(figsize=(40,10), dpi=50)
    pylab.axis('off') # no axis
    pylab.axes([0., 0., 1., 1.], frameon=False, xticks=[], yticks=[]) # Remove the white edge
    librosa.display.specshow(real_portion[1:250,:], cmap=pylab.get_cmap(cmap))
    pylab.savefig(save_path, bbox_inches=None, pad_inches=0)
    pylab.close()

#  toolkit.py process-movie [--movie-start=<movie-start-seconds>] [--movie-end=<movie-end-seconds>] <movie-name> <segment-length-seconds>
if arguments['process-movie']:
    os.system('redis-cli -p 6399 sadd all:movies "%s"' % arguments['<movie-name>'])
    wavein = wave.open('movies/%s/%s.wav' % (arguments['<movie-name>'], arguments['<movie-name>']), 'rb')
    os.system('mkdir -p static/spectrograms/%s' % arguments['<movie-name>'])
    os.system('mkdir -p static/audio-clips/%s' % arguments['<movie-name>'])
    movieStart = 0 if arguments['--movie-start'] is None else int(arguments['--movie-start'])
    end = math.floor(wavein.getnframes()/wavein.getframerate()) if arguments['--movie-end'] is None else int(arguments['--movie-end'])
    step = int(arguments['<segment-length-seconds>'])
    finalStart = list(range(movieStart, end, step))[-1]
    wavein.setpos(movieStart*wavein.getframerate())
    for start in progressbar.progressbar(range(movieStart, end, step), redirect_stdout=True):
        audioData = numpy.array(array.array('h', wavein.readframes(step*wavein.getframerate())))
        waveout = wave.open('static/audio-clips/%s/%s.wav' % (arguments['<movie-name>'], segmentName(start, step)), 'wb')
        waveout.setparams(wavein.getparams())
        waveout.writeframes(audioData)
        waveout.close()
        os.system('ffmpeg -hide_banner -loglevel panic -y -i file:static/audio-clips/%s/%s.wav file:static/audio-clips/%s/%s.mp3'
                  % (arguments['<movie-name>'], segmentName(start, step), arguments['<movie-name>'], segmentName(start, step)))
        os.system('ffmpeg -hide_banner -loglevel panic -y -i file:static/audio-clips/%s/%s.wav -filter:a "atempo=0.5" -vn file:static/audio-clips/%s/%s-0.5.mp3'
                  % (arguments['<movie-name>'], segmentName(start, step), arguments['<movie-name>'], segmentName(start, step)))
        sig, fs = librosa.load('static/audio-clips/%s/%s.wav' % (arguments['<movie-name>'], segmentName(start, step)), mono=True, sr=44000)
        saveSpectrogram(sig, 'static/spectrograms/%s/%s.jpg' % (arguments['<movie-name>'], segmentName(start, step)),
                        n_fft=1500, hop_length=32, to_db_scale=True, n_mels=128, mel_scale=False, top_db=80, show_shape=False, cmap='bone')
        os.system('jpegoptim -ts -S50 static/spectrograms/%s/%s.jpg > /dev/null' % (arguments['<movie-name>'], segmentName(start, step)))
        os.system('rm "static/audio-clips/%s/%s.wav"' % (arguments['<movie-name>'], segmentName(start, step)))

#  toolkit.py process-annotation <movie-name> <annotator-name>
if arguments['process-annotation']:
    os.system('node populate.js %s %s' % (arguments['<movie-name>'], arguments['<annotator-name>']))

#  toolkit.py export-all-annotations
if arguments['export-all-annotations']:
    os.system('pip install rdbtools python-lzf')
    os.system('rdb --command json dump.rdb > dump.json')
