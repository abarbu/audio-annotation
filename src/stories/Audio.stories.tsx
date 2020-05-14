import React, { useState, useRef, useEffect } from 'react'
import * as Types from '../Types'
import Audio, {
    initialAudioState,
    percentInSegmentToTimeInSegment,
    playAudio,
    playAudioPercent,
    stopAudio,
} from '../components/Audio'
import RegionPlayer from '../components/RegionPlayer'
import Waveform, { drawWaveform } from '../components/Waveform'
import Timeline from '../components/Timeline'
import AudioPosition, { drawAudioPercent, clearAudioPosition } from '../components/AudioPosition'
import _ from 'lodash'
import { useWindowSize } from '../Misc'

export const PlayAudio = () => {
    const [rawAudioBuffer, setRawAudioBuffer] = useState(null as null | ArrayBuffer)
    /* const position = useRef(Types.to(0) as Types.TimeInSegment) */
    const [position, setPosition] = useState(Types.to(0) as Types.TimeInSegment)
    const [playKey, setPlayKey] = useState(0)

    function play() {
        setPlayKey(prev => prev + 1)
    }

    useEffect(() => {
        fetch('http://localhost:4001/api/static/audio-clips/lotr-1/lotr-1:00600:00604.mp3')
            .then(response => response.arrayBuffer())
            .then(result => {
                setRawAudioBuffer(result)
            })
            .catch(error => console.log(error))
    }, [])

    // @ts-ignore
    return (
        <div>
            <button onClick={play}>Play</button>
            <span className="number">{Types.from(position)}</span>
            <Audio
                buffer={rawAudioBuffer}
                playKey={playKey}
                playState={true}
                startTime={Types.to(0)}
                endTime={null}
                onStart={e => console.log(e)}
                onEnd={e => console.log(e)}
                onAsyncPlaySample={pos => {
                    setPosition(pos)
                }}
                onSyncPlaySample={pos => {
                    /* console.log('Sync', pos) */
                }}
                callbackEveryNSeconds={0.01}
                onDecode={ty => console.log(['Decode', ty])}
                onDecodeError={ty => console.log(['DecodeError', ty])}
            />
        </div>
    )
}

const waveformStyle: React.CSSProperties = {
    background: 'orange',
    width: '100%',
    height: '100%',
    maxHeight: '200px',
}

export const BasicWaveform = () => {
    const [rawAudioBuffer, setRawAudioBuffer] = useState(null as null | ArrayBuffer)
    const [decodedBuffer, setDecodedBuffer] = useState<null | AudioBuffer>(null)
    const audioState = useRef(initialAudioState)
    const waveformRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        fetch('http://localhost:4001/api/static/audio-clips/lotr-1/lotr-1:00600:00604.mp3')
            .then(response => response.arrayBuffer())
            .then(result => {
                setRawAudioBuffer(result)
            })
            .catch(error => console.log(error))
    }, [])

    // @ts-ignore
    return (
        <div>
            <Waveform decodedBuffer={decodedBuffer} canvasStyle={waveformStyle} ref={waveformRef} />
            <Audio
                buffer={rawAudioBuffer}
                playKey={audioState.current.playKey}
                playState={audioState.current.playState}
                startTime={audioState.current.startTime}
                endTime={audioState.current.endTime}
                onStart={e => console.log(e)}
                onEnd={e => console.log(e)}
                onAsyncPlaySample={pos => {
                    console.log('A', pos)
                }}
                onSyncPlaySample={pos => {
                    /* console.log('S', pos) */
                    /* position.current = pos */
                }}
                callbackEveryNSeconds={0.01}
                onDecode={buffer => {
                    console.log(['Decode', buffer])
                    setDecodedBuffer(buffer)
                }}
                onDecodeError={ty => console.log(['DecodeError', ty])}
            />
        </div>
    )
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

export const BasicPlayRegion = () => {
    const [rawAudioBuffer, setRawAudioBuffer] = useState(null as null | ArrayBuffer)
    const [decodedBuffer, setDecodedBuffer] = useState<null | AudioBuffer>(null)
    const [audioState, setAudioState] = useState(initialAudioState)
    const waveformRef = useRef<HTMLCanvasElement>(null)
    const regionRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        fetch('http://localhost:4001/api/static/audio-clips/lotr-1/lotr-1:00600:00604.mp3')
            .then(response => response.arrayBuffer())
            .then(result => {
                setRawAudioBuffer(result)
            })
            .catch(error => console.log(error))
    }, [])

    console.log('redraw')
    // @ts-ignore
    return (
        <div style={containerStyle}>
            {decodedBuffer ? (
                <RegionPlayer
                    decodedBuffer={decodedBuffer}
                    canvasStyle={regionStyle}
                    ref={regionRef}
                    onMouseDown={() =>
                        setAudioState(prev => ({
                            playKey: prev.playKey + 1,
                            playState: false,
                            startTime: Types.to(0),
                            endTime: null,
                        }))
                    }
                    onClick={position => {
                        playAudioPercent(position, null, setAudioState, decodedBuffer!)
                    }}
                    onSelectRegion={(start, end) => playAudioPercent(start, end, setAudioState, decodedBuffer!)}
                />
            ) : null}
            <Waveform decodedBuffer={decodedBuffer} canvasStyle={waveformStyle} ref={waveformRef}></Waveform>
            <Audio
                buffer={rawAudioBuffer}
                playKey={audioState.playKey}
                playState={audioState.playState}
                startTime={audioState.startTime}
                endTime={audioState.endTime}
                onStart={e => console.log(e)}
                onEnd={e => console.log(e)}
                onAsyncPlaySample={pos => {
                    console.log('A', pos)
                }}
                callbackEveryNSeconds={0.01}
                onDecode={buffer => {
                    console.log(['Decode', buffer])
                    setDecodedBuffer(buffer)
                }}
                onDecodeError={ty => console.log(['DecodeError', ty])}
            ></Audio>
        </div>
    )
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

export const PlayWithPosition = () => {
    const [rawAudioBuffer, setRawAudioBuffer] = useState(null as null | ArrayBuffer)
    const [decodedBuffer, setDecodedBuffer] = useState<null | AudioBuffer>(null)
    const [audioState, setAudioState] = useState(initialAudioState)
    const waveformRef = useRef<HTMLCanvasElement>(null)
    const regionRef = useRef<HTMLCanvasElement>(null)
    const positionRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        fetch('http://localhost:4001/api/static/audio-clips/lotr-1/lotr-1:00600:00604.mp3')
            .then(response => response.arrayBuffer())
            .then(result => {
                setRawAudioBuffer(result)
            })
            .catch(error => console.log(error))
    }, [])

    console.log('redraw')
    // @ts-ignore
    return (
        <div style={containerStyle}>
            {decodedBuffer ? (
                <RegionPlayer
                    decodedBuffer={decodedBuffer}
                    canvasStyle={regionStyle}
                    ref={regionRef}
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
                onDecodeError={ty => console.log(['DecodeError', ty])}
            />
        </div>
    )
}

const timelineStyle: React.CSSProperties = {
    width: '100%',
    height: '20%',
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: '0px',
    bottom: '0px',
    zIndex: 0,
    background: 'black',
}

const waveformStyle2: React.CSSProperties = {
    width: '100%',
    height: '80%',
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: '20%',
    bottom: '0px',
    zIndex: 0,
    background: 'orange',
}

function updateStyle(css_: React.CSSProperties, size: any) {
    let css = _.clone(css_)
    css.width = size.width - 20 + 'px'
    css.height = '200px'
    return css
}

/* 
 * background: 'orange',
 *       width: '100%',
 *       height: '100%',
 *       maxHeight: '200px',
 *  */

export const PlayWithPositionAndTimeline = () => {
    const [rawAudioBuffer, setRawAudioBuffer] = useState(null as null | ArrayBuffer)
    const [decodedBuffer, setDecodedBuffer] = useState<null | AudioBuffer>(null)
    const [audioState, setAudioState] = useState(initialAudioState)
    const waveformRef = useRef<HTMLCanvasElement>(null)
    const regionRef = useRef<HTMLCanvasElement>(null)
    const positionRef = useRef<HTMLCanvasElement>(null)
    const timelineRef = useRef<SVGSVGElement>(null)
    const size = useWindowSize()

    useEffect(() => {
        fetch('http://localhost:4001/api/static/audio-clips/lotr-1/lotr-1:00600:00604.mp3')
            .then(response => response.arrayBuffer())
            .then(result => {
                setRawAudioBuffer(result)
            })
            .catch(error => console.log(error))
    }, [])

    console.log('redraw')
    // @ts-ignore
    return (
        <div style={updateStyle(containerStyle, size)}>
            {decodedBuffer ? (
                <RegionPlayer
                    decodedBuffer={decodedBuffer}
                    canvasStyle={regionStyle}
                    ref={regionRef}
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
            <Waveform decodedBuffer={decodedBuffer} canvasStyle={waveformStyle2} ref={waveformRef}></Waveform>
            <Timeline svgStyle={timelineStyle} ref={timelineRef} startTime={Types.to(0)} endTime={Types.to(4)} orientation={'top'} />
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
                onDecodeError={ty => console.log(['DecodeError', ty])}
            />
        </div>
    )
}

// <button onClick={play}>Play</button>
// <span className="number">{Types.from(position)}</span>

export default {
    title: 'Audio',
    component: Audio,
}
