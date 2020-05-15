import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as Types from '../Types'
import Spectrogram from '../components/Spectrogram'
import RegionPlayer from '../components/RegionPlayer'
import AnnotationLayer, { updateAnnotation } from '../components/AnnotationLayer'
import _ from 'lodash'
import EditorButtons from '../components/EditorButtons'
import EditorTranscript from '../components/EditorTranscript'
import EditorAdvancedButtons from '../components/EditorAdvancedButtons'
import EditorReferenceSelector from '../components/EditorReferenceSelector'
import AudioPosition, { drawAudioPercent, clearAudioPosition } from '../components/AudioPosition'
import { useWindowSize, useEffectDebugger } from '../Misc'
import Waveform, { drawWaveform } from '../components/Waveform'
import SpectrogramWithAnnotations from '../components/SpectrogramWithAnnotations'
import { withKnobs, text, boolean, number } from '@storybook/addon-knobs'
import { Typography, Tag, Input, Row, Col, Space, Divider, Card, Button, Radio } from 'antd'
import {
    PlayCircleOutlined, CloseOutlined, LeftOutlined, DoubleLeftOutlined,
    RightOutlined, DoubleRightOutlined, CaretRightOutlined, PauseOutlined
} from '@ant-design/icons';

const { Text } = Typography

const { Search } = Input

export default function EditorUI({
    currentWorker,
    workers,
    movieName,
    startTime,
    endTime,
}: {
    currentWorker: string
    workers: string[]
    movieName: string
    startTime: Types.TimeInMovie
    endTime: Types.TimeInMovie
}) {
    const [annotations, setAnnotations] = useState<{ [worker: string]: Types.Annotation[] }>({})
    const [isLocked, setIsLocked] = useState(false)
    const [selected, setSelected] = useState<null | number>(null)
    const [bottomWorker, setBottomWorker] = useState('andrei')
    const [topWorker, setTopWorker] = useState('rev')

    useEffect(() => {
        /* FIXME THIS NEEDS TO SAVE */

        console.log('HTTP')
        let data = {
            movieName: movieName,
            workers: workers,
            // TODO This is intentional, abstract the -4 away, it's so that we see annotations that fall into our segment.
            startS: Types.from(startTime) - 4,
            endS: Types.from(endTime),
        }
        fetch(
            `http://localhost:4001/api/annotations?movieName=${encodeURIComponent(movieName)}&startS=${encodeURIComponent(
                Types.from(startTime)
            )}&endS=${encodeURIComponent(Types.from(endTime))}&${_.join(
                _.map(workers, (w: string) => 'workers=' + encodeURIComponent(w)),
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
                _.forEach(result.allAnnotations, as => _.forEach(as, (a, key) => a.index = key))
                setAnnotations(result.allAnnotations)
            })
            .catch(error => console.log(error))
    }, [movieName, startTime, endTime, workers])

    const setTopAnnotations = useCallback(
        (fn: (prev: Types.Annotation[]) => Types.Annotation[]) => {
            console.log('SET Top')
            console.log(fn(annotations[topWorker]))
            setAnnotations(prev => ({ ...prev, rev: fn(prev[topWorker]) }))
        },
        [topWorker, annotations]
    )

    return (
        <>
            <SpectrogramWithAnnotations
                movie={movieName}
                startTime={startTime}
                endTime={endTime}
                topAnnotations={annotations[topWorker]}
                setTopAnnotations={setTopAnnotations}
                bottomAnnotations={annotations[bottomWorker]}
                setBottomAnnotations={null}
            />

            <EditorButtons />
            <EditorTranscript
                annotations={annotations[currentWorker]}
                selected={selected}
                setIsLocked={setIsLocked}
            />
            <EditorReferenceSelector />

            <EditorAdvancedButtons />
        </>
    )
}
