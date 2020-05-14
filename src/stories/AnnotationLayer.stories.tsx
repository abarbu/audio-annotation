import React, { useState, useRef, useEffect } from 'react'
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
import { useWindowSize } from '../Misc'
import Waveform, { drawWaveform } from '../components/Waveform'

function updateStyle(css_: React.CSSProperties, size: any) {
    let css = _.clone(css_)
    css.width = size.width - 20 + 'px'
    css.height = '300px'
    return css
}

const regionStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: '0px',
    bottom: '0px',
    zIndex: 2,
}

const containerStyle: React.CSSProperties = {
    position: 'relative',
}

const positionStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: '0px',
    bottom: '0px',
    zIndex: 1,
}

const imageStylePartial: React.CSSProperties = {
    width: '100%',
    height: '80%',
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: '0px',
    bottom: '0px',
    zIndex: 0,
}

const waveformStyle: React.CSSProperties = {
    position: 'absolute',
    top: '80%',
    background: 'black',
    width: '100%',
    height: '20%',
    maxHeight: '100px',
}

const svgStyle: React.CSSProperties = {
    width: '100%',
    height: '80%',
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: '0px',
    bottom: '0px',
    zIndex: 4,
}

const svgStyle2: React.CSSProperties = {
    width: '100%',
    height: '20%',
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: '80%',
    bottom: '0px',
    zIndex: 4,
}

const startTime = 604
const endTime = 608

/* RGB */
/* https://coolors.co/f79f79-91a6ff-ff88dc-87b6a7-f25c54 */
/* highlight: rgba(247, 159, 121, 1);
 * muted1: rgba(145, 166, 255, 1);
 * accent2: rgba(255, 136, 220, 1);
 * muted2: rgba(135, 182, 167, 1);
 * accent: rgba(242, 92, 84, 1); */
/* Stronger */
/* https://coolors.co/f97632-516bff-ff3ecb-36c79a-f5412e */
/* highlight: rgba(249, 118, 50, 1);
 * muted1: rgba(81, 107, 255, 1);
 * accent2: rgba(255, 62, 203, 1);
 * muted2: rgba(54, 199, 154, 1);
 * accent: rgba(245, 65, 46, 1); */

export const SpectrogramWithAnnotations = () => {
    const [rawAudioBuffer, setRawAudioBuffer] = useState(null as null | ArrayBuffer)
    const [decodedBuffer, setDecodedBuffer] = useState<null | AudioBuffer>(null)
    const [audioState, setAudioState] = useState(initialAudioState)
    const regionRef = useRef<HTMLCanvasElement>(null)
    const waveformRef = useRef<HTMLCanvasElement>(null)
    const positionRef = useRef<HTMLCanvasElement>(null)
    const regionDragRef = useRef<Types.DragFunctions>(null)
    const [annotations, setAnnotations] = useState<{ [worker: string]: Types.Annotation[] }>({})
    const size = useWindowSize()

    useEffect(() => {
        fetch('http://localhost:4001/api/static/audio-clips/lotr-1/lotr-1:00604:00608.mp3')
            .then(response => response.arrayBuffer())
            .then(result => {
                setRawAudioBuffer(result)
            })
            .catch(error => console.log(error))
    }, [])

    useEffect(() => {
        let data = {
            movieName: 'lotr-1',
            workers: ['andrei', 'rev'],
            startS: startTime - 4, // TODO This is intentional, abstract the -4 away, it's so that we see annotations that fall into our segment.
            endS: endTime,
        }
        fetch(
            `http://localhost:4001/api/annotations?movieName=${encodeURIComponent(
                data.movieName
            )}&startS=${encodeURIComponent(data.startS)}&endS=${encodeURIComponent(data.endS)}&${_.join(
                _.map(data.workers, w => 'workers=' + encodeURIComponent(w)),
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
    }, [])

    // @ts-ignore
    return (
        <div style={updateStyle(containerStyle, size)}>
            <AnnotationLayer
                svgStyle={svgStyle}
                annotations={annotations['rev']}
                startTime={Types.to(startTime)}
                buffer={decodedBuffer}
                color={'rgba(54, 199, 154, 1)'}
                colorSelected={'rgba(249, 118, 50, 1)'}
                selectable={true}
                updateAnnotation={updateAnnotation(
                    'rev',
                    setAnnotations,
                    decodedBuffer!,
                    (annotations, prev, next, position, d) => {
                        if (Types.from(next.endTime!) - 0.01 <= Types.from(next.startTime!)) return true
                        if (Types.from(next.startTime!) + 0.01 >= Types.from(next.endTime!)) return true
                        if (
                            _.filter(
                                annotations,
                                a =>
                                    Types.isValidAnnotation(a) &&
                                    (Types.from(a.startTime!) > Types.from(next.startTime!) && a.index < next.index)
                            ).length > 0
                        )
                            return true
                        if (
                            _.filter(
                                annotations,
                                a =>
                                    Types.isValidAnnotation(a) &&
                                    (Types.from(a.startTime!) < Types.from(next.startTime!) && a.index > next.index)
                            ).length > 0
                        )
                            return true
                        return false
                    }
                )}
                onWordClicked={a => playAudioInMovie(a.startTime!, a.endTime!, setAudioState, Types.to(startTime))}
                onBackgroundDrag={x => regionDragRef.current!.onDrag(x)}
                onBackgroundDragStart={x => regionDragRef.current!.onDragStart(x)}
                onBackgroundDragEnd={x => regionDragRef.current!.onDragEnd(x)}
                onInteract={() => regionDragRef.current!.onClear()}
            />
            <AnnotationLayer
                svgStyle={svgStyle2}
                annotations={annotations['andrei']}
                startTime={Types.to(startTime)}
                buffer={decodedBuffer}
                color={'rgba(81, 107, 255, 1)'}
                colorSelected={'rgba(255, 62, 203, 1)'}
                textHeight={'80%'}
                midlineHeight={'20%'}
                onWordClicked={a => playAudioInMovie(a.startTime!, a.endTime!, setAudioState, Types.to(startTime))}
                onBackgroundDrag={x => regionDragRef.current!.onDrag(x)}
                onBackgroundDragStart={x => regionDragRef.current!.onDragStart(x)}
                onBackgroundDragEnd={x => regionDragRef.current!.onDragEnd(x)}
                onInteract={() => regionDragRef.current!.onClear()}
            />
            <Spectrogram
                canvasStyle={imageStylePartial}
                src={'http://localhost:4001/api/static/spectrograms/lotr-1/lotr-1:00604:00608.jpg'}
            ></Spectrogram>
            {decodedBuffer ? (
                <RegionPlayer
                    ref={regionRef}
                    dragRef={regionDragRef}
                    decodedBuffer={decodedBuffer}
                    canvasStyle={regionStyle}
                    onMouseDown={() => {
                        setAudioState(prev => ({
                            playKey: prev.playKey + 1,
                            playState: false,
                            startTime: Types.to(0),
                            endTime: null,
                        }))
                        clearAudioPosition(positionRef)
                    }}
                    onClick={position => {
                        playAudioPercent(position, null, setAudioState, decodedBuffer!)
                    }}
                    onSelectRegion={(start, end) => playAudioPercent(start, end, setAudioState, decodedBuffer!)}
                />
            ) : null}
            <AudioPosition ref={positionRef} canvasStyle={positionStyle} />
            <Waveform decodedBuffer={decodedBuffer} canvasStyle={waveformStyle} ref={waveformRef}></Waveform>
            <Audio
                buffer={rawAudioBuffer}
                playKey={audioState.playKey}
                playState={audioState.playState}
                startTime={audioState.startTime}
                endTime={audioState.endTime}
                onStart={e => console.log(e)}
                onEnd={(pos, posPercent) => clearAudioPosition(positionRef)}
                onAsyncPlaySample={(pos, posPercent) => {
                    drawAudioPercent(positionRef, posPercent)
                }}
                callbackEveryNSeconds={0.01}
                onDecode={buffer => {
                    console.log(['Decode', buffer])
                    setDecodedBuffer(buffer)
                }}
                onDecodeError={ty => console.log('DecodeError', ty)}
            />
        </div>
    )
}

export default {
    title: 'Annotation Layer',
    component: AnnotationLayer,
}
