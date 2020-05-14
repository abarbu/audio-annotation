import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as Types from '../Types'
import Spectrogram from '../components/Spectrogram'
import RegionPlayer from '../components/RegionPlayer'
import AnnotationLayer, { updateAnnotation } from '../components/AnnotationLayer'
import _ from 'lodash'
import Audio, {
    initialAudioState,
    timeInSegmentToPercentInSegment,
    percentInSegmentToTimeInSegment,
    playAudio,
    playAudioPercent,
    playAudioInMovie,
    stopAudio,
} from '../components/Audio'
import AudioPosition, { drawAudioPercent, clearAudioPosition } from '../components/AudioPosition'
import { useWindowSize, useEffectDebugger } from '../Misc'
import Waveform, { drawWaveform } from '../components/Waveform'
import SpectrogramWithAnnotations from '../components/SpectrogramWithAnnotations'
import { withKnobs, text, boolean, number } from '@storybook/addon-knobs'

const workers = ['andrei', 'rev']

export const ComboUI = () => {
    let movie = text('movie', 'lotr-1')
    let startTime = number('segment', 604, { range: true, min: 0, max: 10000, step: 2 })
    let endTime = startTime + 4
    const [annotations, setAnnotations] = useState<{ [worker: string]: Types.Annotation[] }>({})
    const [bottomWorker, setBottomWorker] = useState('andrei')
    const [topWorker, setTopWorker] = useState('rev')

    useEffectDebugger(
        () => {
            let data = {
                movieName: movie,
                workers: workers,
                startS: startTime - 4, // TODO This is intentional, abstract the -4 away, it's so that we see annotations that fall into our segment.
                endS: endTime,
            }
            fetch(
                `http://localhost:4001/api/annotations?movieName=${encodeURIComponent(
                    data.movieName
                )}&startS=${encodeURIComponent(data.startS)}&endS=${encodeURIComponent(data.endS)}&${_.join(
                    _.map(data.workers, (w: string) => 'workers=' + encodeURIComponent(w)),
                    '&'
                )}`,
                {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )
                .then(response => response.json())
                .then(result => {
                    console.log('ANNOTATION', result)
                    console.log(result.allAnnotations)
                    setAnnotations(result.allAnnotations)
                })
                .catch(error => console.log(error))
        },
        [movie, startTime, endTime, workers],
        ['movie', 'startTime', 'endTime', 'workers'],
        'Get'
    )

    const setTopAnnotations = useCallback(
        (fn: (prev: Types.Annotation[]) => Types.Annotation[]) => {
            setAnnotations(prev => ({ ...prev, rev: fn(prev[topWorker]) }))
        },
        [topWorker]
    )

    return (
        <div>
            <span>{Types.to(startTime)}</span>
            <SpectrogramWithAnnotations
                movie={movie}
                startTime={Types.to(startTime)}
                endTime={Types.to(endTime)}
                topAnnotations={annotations[topWorker]}
                setTopAnnotations={setTopAnnotations}
                bottomAnnotations={annotations[bottomWorker]}
                setBottomAnnotations={null}
            />
        </div>
    )
}

export const EditorUI = () => {
    let movie = text('movie', 'lotr-1')
    let startTime = number('segment', 604, { range: true, min: 0, max: 10000, step: 2 })
    let endTime = startTime + 4
    const [annotations, setAnnotations] = useState<{ [worker: string]: Types.Annotation[] }>({})
    const [bottomWorker, setBottomWorker] = useState('andrei')
    const [topWorker, setTopWorker] = useState('rev')

    useEffectDebugger(
        () => {
            let data = {
                movieName: movie,
                workers: workers,
                startS: startTime - 4, // TODO This is intentional, abstract the -4 away, it's so that we see annotations that fall into our segment.
                endS: endTime,
            }
            fetch(
                `http://localhost:4001/api/annotations?movieName=${encodeURIComponent(
                    data.movieName
                )}&startS=${encodeURIComponent(data.startS)}&endS=${encodeURIComponent(data.endS)}&${_.join(
                    _.map(data.workers, (w: string) => 'workers=' + encodeURIComponent(w)),
                    '&'
                )}`,
                {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )
                .then(response => response.json())
                .then(result => {
                    console.log('ANNOTATION', result)
                    console.log(result.allAnnotations)
                    setAnnotations(result.allAnnotations)
                })
                .catch(error => console.log(error))
        },
        [movie, startTime, endTime, workers],
        ['movie', 'startTime', 'endTime', 'workers'],
        'Get'
    )

    const setTopAnnotations = useCallback(
        (fn: (prev: Types.Annotation[]) => Types.Annotation[]) => {
            setAnnotations(prev => ({ ...prev, rev: fn(prev[topWorker]) }))
        },
        [topWorker]
    )

    return (
        <div>
            <span>{Types.to(startTime)}</span>
            <SpectrogramWithAnnotations
                movie={movie}
                startTime={Types.to(startTime)}
                endTime={Types.to(endTime)}
                topAnnotations={annotations[topWorker]}
                setTopAnnotations={setTopAnnotations}
                bottomAnnotations={annotations[bottomWorker]}
                setBottomAnnotations={null}
            />
        </div>
    )
}

export default {
    title: 'Spectrogram With Annotations',
    component: SpectrogramWithAnnotations,
    decorators: [withKnobs],
}
