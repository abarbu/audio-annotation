import React, { useState, useRef, useEffect } from 'react'
import * as Types from '../Types'
import Spectrogram from '../components/Spectrogram'
import RegionPlayer from '../components/RegionPlayer'
import _ from 'lodash'
import Audio, {
    initialAudioState,
    percentInSegmentToTimeInSegment,
    playAudio,
    playAudioPercent,
    stopAudio,
} from '../components/Audio'
import AudioPosition, { drawAudioPercent, clearAudioPosition } from '../components/AudioPosition'
import { useWindowSize } from '../Misc'
import Waveform, { drawWaveform } from '../components/Waveform'

export const BasicSpectrogram = () => {
    const [image, setImage] = useState(null as null | string)

    // @ts-ignore
    return (
        <div>
            <Spectrogram src={'http://localhost:4001/api/static/spectrograms/venom/venom:00162:00166.jpg'}></Spectrogram>
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

const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: '0px',
    bottom: '0px',
    zIndex: 0,
}

function updateStyle(css_: React.CSSProperties, size: any) {
    let css = _.clone(css_)
    css.width = size.width - 20 + 'px'
    css.height = '300px'
    return css
}

export const SpectrogramWithAudio = () => {
    const [rawAudioBuffer, setRawAudioBuffer] = useState(null as null | ArrayBuffer)
    const [decodedBuffer, setDecodedBuffer] = useState<null | AudioBuffer>(null)
    const [audioState, setAudioState] = useState(initialAudioState)
    const regionRef = useRef<HTMLCanvasElement>(null)
    const positionRef = useRef<HTMLCanvasElement>(null)
    const size = useWindowSize()

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
        <div style={updateStyle(containerStyle, size)}>
            <Spectrogram
                canvasStyle={imageStyle}
                src={'http://localhost:4001/api/static/spectrograms/venom/venom:00162:00166.jpg'}
            ></Spectrogram>
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
            <AudioPosition ref={positionRef} canvasStyle={positionStyle} />
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

export const SpectrogramWithAudioAndWaveform = () => {
    const [rawAudioBuffer, setRawAudioBuffer] = useState(null as null | ArrayBuffer)
    const [decodedBuffer, setDecodedBuffer] = useState<null | AudioBuffer>(null)
    const [audioState, setAudioState] = useState(initialAudioState)
    const regionRef = useRef<HTMLCanvasElement>(null)
    const waveformRef = useRef<HTMLCanvasElement>(null)
    const positionRef = useRef<HTMLCanvasElement>(null)
    const size = useWindowSize()

    useEffect(() => {
        fetch('http://localhost:4001/api/static/audio-clips/lotr-1/lotr-1:00604:00608.mp3')
            .then(response => response.arrayBuffer())
            .then(result => {
                setRawAudioBuffer(result)
            })
            .catch(error => console.log(error))
    }, [])

    // @ts-ignore
    return (
        <div style={updateStyle(containerStyle, size)}>
            <Spectrogram
                canvasStyle={imageStylePartial}
                src={'http://localhost:4001/api/static/spectrograms/lotr-1/lotr-1:00604:00608.jpg'}
            ></Spectrogram>
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
    title: 'Spectrogram',
    component: Spectrogram,
}
