import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as Types from '../Types'
import Spectrogram from '../components/Spectrogram'
import RegionPlayer from '../components/RegionPlayer'
import AnnotationLayer, { updateAnnotation, shouldRejectAnnotationUpdate } from '../components/AnnotationLayer'
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
import Waveform from '../components/Waveform'
import Timeline from '../components/Timeline'

function updateStyle(css_: React.CSSProperties, size: any) {
    let css = _.clone(css_)
    css.width = size.width - 20 + 'px'
    css.height = '300px'
    return css
}

export function movieLocation(movie: string, startTime: Types.TimeInMovie, endTime: Types.TimeInMovie) {
    return movie + '/' +
        movie + ':' + _.padStart('' + Types.from(startTime), 5, '0') + ':' + _.padStart('' + Types.from(endTime), 5, '0')
}

export function setWorkerAnnotations(setAnnotations: ((value: React.SetStateAction<{ [worker: string]: Types.Annotation[] }>) => any),
    worker: string) {
    return ((anns: Types.Annotation[]) => setAnnotations(prev => ({ ...prev, [worker]: anns })))
}

const spectrogramAnnotationStyle_: React.CSSProperties = {
    width: '100%',
    height: '75%',
    position: 'absolute',
    top: '0%',
    zIndex: 4,
}

const waveformAnnotationStyle_: React.CSSProperties = {
    width: '100%',
    height: '20%',
    position: 'absolute',
    top: '75%',
    zIndex: 4,
}

const spectrogramStyle_: React.CSSProperties = {
    width: '100%',
    height: '75%',
    position: 'absolute',
    top: '0%',
    zIndex: 0,
}

const regionStyle_: React.CSSProperties = { width: '100%', height: '100%', position: 'absolute', top: '0px', zIndex: 2 }

const audioPositionStyle_: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: '0px',
    zIndex: 1,
}

const waveformStyle_: React.CSSProperties = { width: '100%', height: '20%', position: 'absolute', top: '75%', zIndex: 0, background: 'black' }

const timelineStyle_: React.CSSProperties = {
    width: '100%',
    height: '5%',
    position: 'absolute',
    left: '0px',
    right: '0px',
    top: '95%',
    bottom: '0px',
    zIndex: 0,
    background: 'black',
}

export default React.memo(function SpectrogramWithAnnotations({
    movie,
    startTime,
    endTime,
    topAnnotations = [],
    bottomAnnotations = [],
    setTopAnnotations = null,
    setBottomAnnotations = null,
    containerStyle = { position: 'relative' },
    spectrogramAnnotationStyle = spectrogramAnnotationStyle_,
    waveformAnnotationStyle = waveformAnnotationStyle_,
    spectrogramStyle = spectrogramStyle_,
    regionStyle = regionStyle_,
    audioPositionStyle = audioPositionStyle_,
    waveformStyle = waveformStyle_,
    timelineStyle = timelineStyle_
}: {
    movie: string
    startTime: Types.TimeInMovie
    endTime: Types.TimeInMovie
    containerStyle?: React.CSSProperties
    spectrogramAnnotationStyle?: React.CSSProperties
    waveformAnnotationStyle?: React.CSSProperties
    spectrogramStyle?: React.CSSProperties
    regionStyle?: React.CSSProperties
    audioPositionStyle?: React.CSSProperties
    waveformStyle?: React.CSSProperties
    timelineStyle?: React.CSSProperties
    topAnnotations?: Types.Annotation[]
    bottomAnnotations?: Types.Annotation[]
    setTopAnnotations?: null | ((fn: (prev: Types.Annotation[]) => Types.Annotation[]) => void)
    setBottomAnnotations?: null | ((fn: (prev: Types.Annotation[]) => Types.Annotation[]) => void)
}) {
    const [rawAudioBuffer, setRawAudioBuffer] = useState(null as null | ArrayBuffer)
    const [decodedBuffer, setDecodedBuffer] = useState<null | AudioBuffer>(null)
    const [audioState, setAudioState] = useState(initialAudioState)
    const regionRef = useRef<HTMLCanvasElement>(null)
    const waveformRef = useRef<HTMLCanvasElement>(null)
    const positionRef = useRef<HTMLCanvasElement>(null)
    const regionDragRef = useRef<Types.DragFunctions>(null)
    const timelineRef = useRef<SVGSVGElement>(null)
    const size = useWindowSize()

    useEffect(() => {
        fetch('http://localhost:4001/api/static/audio-clips/' + movieLocation(movie, startTime, endTime) + '.mp3')
            .then(response => response.arrayBuffer())
            .then(result => {
                setRawAudioBuffer(result)
            })
            .catch(error => console.log(error))
    }, [movie, startTime, endTime])

    const onInterfactFn = useCallback(() => regionDragRef.current!.onClear(), [regionDragRef])
    const onBackgroundDragFn = useCallback(x => regionDragRef.current!.onDrag(x), [regionDragRef])
    const onBackgroundDragStartFn = useCallback(x => regionDragRef.current!.onDragStart(x), [regionDragRef])
    const onBackgroundDragEndFn = useCallback(x => regionDragRef.current!.onDragEnd(x), [regionDragRef])
    const onWordClickedFn = useCallback((a, startTime) => playAudioInMovie(a.startTime!, a.endTime!, setAudioState, startTime), [setAudioState, startTime])
    const updateAnnotationFn = useCallback((...args) => setTopAnnotations ?
        updateAnnotation(
            setTopAnnotations,
            decodedBuffer!,
            shouldRejectAnnotationUpdate
            // @ts-ignore
        )(...args) : (() => null),
        [decodedBuffer, shouldRejectAnnotationUpdate]
    )

    const onRegionMouseDown = useCallback(() => {
        setAudioState(prev => ({
            playKey: prev.playKey + 1,
            playState: false,
            startTime: Types.to(0),
            endTime: null,
        }))
        clearAudioPosition(positionRef)
    }, [positionRef])

    const onRegionClick = useCallback(position => {
        playAudioPercent(position, null, setAudioState, decodedBuffer!)
    }, [setAudioState, decodedBuffer])

    const onSelectRegion = useCallback((start, end) => playAudioPercent(start, end, setAudioState, decodedBuffer!),
        [setAudioState, decodedBuffer])

    // @ts-ignore
    return (
        <div style={updateStyle(containerStyle, size)}>
            <AnnotationLayer
                svgStyle={spectrogramAnnotationStyle}
                annotations={topAnnotations}
                startTime={startTime}
                buffer={decodedBuffer}
                color={'rgba(54, 199, 154, 1)'}
                colorSelected={'rgba(249, 118, 50, 1)'}
                selectable={true}
                updateAnnotation={updateAnnotationFn}
                onWordClicked={onWordClickedFn}
                onBackgroundDrag={onBackgroundDragFn}
                onBackgroundDragStart={onBackgroundDragStartFn}
                onBackgroundDragEnd={onBackgroundDragEndFn}
                onInteract={onInterfactFn}
            />
            <AnnotationLayer
                svgStyle={waveformAnnotationStyle}
                annotations={bottomAnnotations}
                startTime={startTime}
                buffer={decodedBuffer}
                color={'rgba(81, 107, 255, 1)'}
                colorSelected={'rgba(255, 62, 203, 1)'}
                textHeight={'80%'}
                midlineHeight={'20%'}
                onWordClicked={onWordClickedFn}
                onBackgroundDrag={onBackgroundDragFn}
                onBackgroundDragStart={onBackgroundDragStartFn}
                onBackgroundDragEnd={onBackgroundDragEndFn}
                onInteract={onInterfactFn}
            />
            <Waveform decodedBuffer={decodedBuffer} canvasStyle={waveformStyle} ref={waveformRef}></Waveform>
            <Timeline svgStyle={timelineStyle} ref={timelineRef}
                startTime={startTime} endTime={endTime}
                orientation={'bottom'} labelHeightPecent={'50%'} />
            <Spectrogram
                canvasStyle={spectrogramStyle}
                src={'http://localhost:4001/api/static/spectrograms/' + movieLocation(movie, startTime, endTime) + '.jpg'}
            ></Spectrogram>
            {decodedBuffer ? (
                <RegionPlayer
                    ref={regionRef}
                    // @ts-ignore TODO
                    dragRef={regionDragRef}
                    decodedBuffer={decodedBuffer}
                    canvasStyle={regionStyle}
                    onMouseDown={onRegionMouseDown}
                    onClick={onRegionClick}
                    onSelectRegion={onSelectRegion}
                />
            ) : null}
            <AudioPosition ref={positionRef} canvasStyle={audioPositionStyle} />
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
                    setDecodedBuffer(buffer)
                }}
                onDecodeError={ty => console.log('DecodeError', ty)}
            />
        </div>
    )
})