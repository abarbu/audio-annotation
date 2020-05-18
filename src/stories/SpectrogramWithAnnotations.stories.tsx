import '../App.css'
/* import '../App.less' */
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
    AudioState,
} from '../components/Audio'
import AudioPosition, { drawAudioPercent, clearAudioPosition } from '../components/AudioPosition'
import { useWindowSize, useEffectDebugger } from '../Misc'
import Waveform, { drawWaveform } from '../components/Waveform'
import SpectrogramWithAnnotations from '../components/SpectrogramWithAnnotations'
import { withKnobs, text, boolean, number } from '@storybook/addon-knobs'
import { Typography, Tag, Input, Row, Col, Space, Divider, Card, Button, Radio } from 'antd'
const { Text } = Typography

const workers = ['andrei', 'rev']

export const ComboUI = () => {
    let movie = text('movie', 'lotr-1')
    let startTime = number('segment', 604, { range: true, min: 0, max: 10000, step: 2 })
    let endTime = startTime + 4
    const [annotations, setAnnotations] = useState<{ [worker: string]: Types.Annotation[] }>({})
    const [bottomWorker, setBottomWorker] = useState('andrei')
    const [topWorker, setTopWorker] = useState('rev')
    const [audioState, setAudioState] = useState<AudioState>(initialAudioState)

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
                audioState={audioState}
                setAudioState={setAudioState}
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
    const [audioState, setAudioState] = useState<AudioState>(initialAudioState)

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
            <SpectrogramWithAnnotations
                audioState={audioState}
                setAudioState={setAudioState}
                movie={movie}
                startTime={Types.to(startTime)}
                endTime={Types.to(endTime)}
                topAnnotations={annotations[topWorker]}
                setTopAnnotations={setTopAnnotations}
                bottomAnnotations={annotations[bottomWorker]}
                setBottomAnnotations={null}
            />
            <Card bordered={false} size={'small'}>
                <div className="button-row" style={{ wordWrap: 'break-word', textAlign: 'center' }}>
                    <Space size={1}>
                        <Button className="element-neutral" type="primary" size="small">
                            Play from beginning
            </Button>
                        <Button className="element-neutral" type="primary" size="small">
                            Stop
            </Button>
                    </Space>
                    <Divider type="vertical" style={{ borderLeftColor: 'white' }} />
                    <Space size={1}>
                        <Button className="element-neutral" type="primary" size="small">
                            Start next word
            </Button>
                        <Button className="element-neutral" type="primary" size="small">
                            Start word after word
            </Button>
                    </Space>
                    <Divider type="vertical" style={{ borderLeftColor: 'white' }} />
                    <Space size={1}>
                        <Button className="element-neutral" type="primary" size="small">
                            Play selection
            </Button>
                        <Button className="element-neutral" type="primary" size="small">
                            Delete selection
            </Button>
                    </Space>
                    <Divider type="vertical" style={{ borderLeftColor: 'white' }} />
                    <Space size={1}>
                        <Button className="element-neutral" type="primary" size="small">
                            Replace with reference
            </Button>
                        <Button className="element-neutral" type="primary" size="small">
                            Use reference to fill
            </Button>
                    </Space>
                    <Divider type="vertical" style={{ borderLeftColor: 'white' }} />
                    <Space size={1}>
                        <Button className="element-saves" type="primary" size="small">
                            - 4s
            </Button>
                        <Button className="element-saves" type="primary" size="small">
                            Backward 2s
            </Button>
                        <Button className="element-saves" type="primary" size="small">
                            Forward 2s
            </Button>
                        <Button className="element-saves" type="primary" size="small">
                            + 4s
            </Button>
                    </Space>
                </div>
            </Card>
            <Card bordered={false} size="small">
                <div className="button-row" style={{ wordWrap: 'break-word', textAlign: 'center' }}>
                    <Button className="element-saves" type="primary" size="middle">
                        Edit transcript
          </Button>
                    <Divider type="vertical" style={{ borderLeftColor: 'white' }} />
                    {false ? (
                        <Input placeholder="Enter transcript" style={{ width: '80%' }} />
                    ) : (
                            <>
                                <Tag className="word" color="#f50">
                                    And
              </Tag>
                                <Tag className="word" color="#87d068">
                                    yes
              </Tag>
                                <Tag className="word" color="#87d068">
                                    no
              </Tag>
                                <Tag className="word" color="#f50">
                                    doubt
              </Tag>
                                <Tag className="word" color="#87d068">
                                    to
              </Tag>
                                <Tag className="word" color="#fa8c16">
                                    others
              </Tag>
                                <Tag className="word" color="#87d068">
                                    our
              </Tag>
                            </>
                        )}
                    <br></br>
                    <Text strong>Special cases:</Text>
                    <div style={{ display: 'inline-block' }}>
                        <Text code>If you can't make out a word or someone is not speaking English use '#' as a placeholder.</Text>
                    </div>
                    <div style={{ display: 'inline-block' }}>
                        <Text code>If multiple speakers are overlapping, annotate the whole region with '%'.</Text>
                    </div>
                    <br></br>
                    <Text strong>Legend: </Text>
                    <Tag color="#87d068">Your annotation</Tag>
                    <Tag color="#f50">Unannotated word</Tag>
                    <Tag color="#fa8c16">Selected word</Tag>
                    <Tag color="#2db7f5">Reference annotation</Tag>
                </div>
            </Card>
        </div>
    )
}

export default {
    title: 'Spectrogram With Annotations',
    component: SpectrogramWithAnnotations,
    decorators: [withKnobs],
}
