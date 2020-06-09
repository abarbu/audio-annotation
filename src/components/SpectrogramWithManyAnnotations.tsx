import React, { useState, useRef, useEffect, useCallback, MutableRefObject } from 'react'
import * as Types from '../Types'
import Spectrogram from '../components/Spectrogram'
import RegionPlayer from '../components/RegionPlayer'
import AnnotationLayer, { updateAnnotation, shouldRejectAnnotationUpdate } from '../components/AnnotationLayer'
import _ from 'lodash'
import Audio, {
    percentInSegmentToTimeInSegment,
    playAudioPercent,
    playAudioInMovie,
    AudioState,
} from '../components/Audio'
import { apihost } from '../Misc'
import AudioPosition, { drawAudioPercent, clearAudioPosition } from '../components/AudioPosition'
import Waveform from '../components/Waveform'
import Timeline from '../components/Timeline'

export function setWorkerAnnotations(
    setAnnotations: (value: React.SetStateAction<{ [worker: string]: Types.Annotation[] }>) => any,
    worker: string
) {
    return (anns: Types.Annotation[]) => setAnnotations(prev => ({ ...prev, [worker]: anns }))
}

const spectrogramAnnotationStyle_: React.CSSProperties = {
    width: '100%',
    height: '85%',
    position: 'absolute',
    top: '0%',
    zIndex: 4,
}

const waveformAnnotationStyle_: React.CSSProperties = {
    width: '100%',
    height: '10%',
    position: 'absolute',
    top: '85%',
    zIndex: 4,
}

const spectrogramStyle_: React.CSSProperties = {
    width: '100%',
    height: '85%',
    position: 'absolute',
    top: '0%',
    zIndex: 0,
}

const regionStyle_: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: '0px',
    zIndex: 2,
}

const audioPositionStyle_: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: '0px',
    zIndex: 1,
}

const waveformStyle_: React.CSSProperties = {
    width: '100%',
    height: '10%',
    position: 'absolute',
    top: '85%',
    zIndex: 0,
    background: 'black',
}

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

export default React.memo(function SpectrogramWithManyAnnotations({
    movie,
    startTime,
    endTime,
    annotations = {},
    workers = [],
    containerStyle = { position: 'relative' },
    spectrogramAnnotationStyle = spectrogramAnnotationStyle_,
    waveformAnnotationStyle = waveformAnnotationStyle_,
    spectrogramStyle = spectrogramStyle_,
    regionStyle = regionStyle_,
    audioPositionStyle = audioPositionStyle_,
    waveformStyle = waveformStyle_,
    timelineStyle = timelineStyle_,
    audioState,
    setAudioState,
    setClickPositions,
    clearClickMarker,
    onMessage = () => null,
    users = []
}: {
    movie: string
    startTime: Types.TimeInMovie
    endTime: Types.TimeInMovie
    annotations: { [user: string]: Types.Annotation[] }
    workers: string[]
    containerStyle?: React.CSSProperties
    spectrogramAnnotationStyle?: React.CSSProperties
    waveformAnnotationStyle?: React.CSSProperties
    spectrogramStyle?: React.CSSProperties
    regionStyle?: React.CSSProperties
    audioPositionStyle?: React.CSSProperties
    waveformStyle?: React.CSSProperties
    timelineStyle?: React.CSSProperties
    audioState: AudioState
    setAudioState: (val: React.SetStateAction<AudioState>) => any
    setClickPositions?: (val: React.SetStateAction<Types.TimeInSegment[]>, clearn: boolean) => any
    clearClickMarker?: MutableRefObject<() => any>
    onMessage?: (level: Types.MessageLevel, value: string) => any
    users?: string[]
}) {
    const [rawAudioBufferNormal, setRawAudioBufferNormal] = useState(null as null | ArrayBuffer)
    const [rawAudioBufferHalf, setRawAudioBufferHalf] = useState(null as null | ArrayBuffer)
    const [decodedBuffer, setDecodedBuffer] = useState<null | AudioBuffer>(null)
    const regionRef = useRef<HTMLCanvasElement>(null)
    const waveformRef = useRef<HTMLCanvasElement>(null)
    const positionRef = useRef<HTMLCanvasElement>(null)
    const regionDragRef = useRef<Types.DragFunctions>(null)
    const timelineRef = useRef<SVGSVGElement>(null)

    useEffect(() => {
        fetch(apihost + 'api/static/audio-clips/' + Types.movieLocation(movie, startTime, endTime) + '.mp3')
            .then(response => response.arrayBuffer())
            .then(result => {
                setRawAudioBufferNormal(result)
            })
            .catch(error => console.log(error))
    }, [movie, startTime, endTime])

    useEffect(() => {
        fetch(apihost + 'api/static/audio-clips/' + Types.movieLocation(movie, startTime, endTime) + '-0.5.mp3')
            .then(response => response.arrayBuffer())
            .then(result => {
                setRawAudioBufferHalf(result)
            })
            .catch(error => console.log(error))
    }, [movie, startTime, endTime])

    const onInteractFn = useCallback(
        (x?: number, p?: Types.TimeInSegment) => {
            if (!_.isUndefined(p) && setClickPositions) {
                setClickPositions([p], false)
            }
            if (!_.isUndefined(x)) {
                regionDragRef.current!.onDragStart(x)
            }
        },
        [setClickPositions]
    )
    const onBackgroundDragFn = useCallback(x => regionDragRef.current!.onDrag(x), [regionDragRef])
    const onBackgroundDragStartFn = useCallback(x => regionDragRef.current!.onDragStart(x), [regionDragRef])
    const onBackgroundDragEndFn = useCallback(x => regionDragRef.current!.onDragEnd(x), [regionDragRef])
    const onWordClickedFn = useCallback(
        (a, startTime) => {
            onMessage(Types.MessageLevel.closed, '')
            playAudioInMovie(a.startTime!, a.endTime!, setAudioState, startTime)
        },
        [setAudioState, startTime]
    )

    const onRegionMouseDown = useCallback(() => {
        setAudioState(prev => ({
            playKey: prev.playKey + 1,
            playState: false,
            startTime: Types.to(0),
            endTime: null,
            playbackRate: 'normal',
        }))
        clearAudioPosition(positionRef)
        onMessage(Types.MessageLevel.closed, '')
    }, [positionRef])

    useEffect(() => {
        clearClickMarker!.current = () => {
            if (regionDragRef.current) regionDragRef.current.onClear()
        }
    }, [positionRef])

    const onRegionClick = useCallback(
        (position: Types.PercentInSegment, shiftKey: boolean) => {
            if (setClickPositions) setClickPositions([percentInSegmentToTimeInSegment(position, decodedBuffer!)], false)
            playAudioPercent(position, shiftKey ? Types.addConst(position, 0.2) : null, setAudioState, decodedBuffer!)
            onMessage(Types.MessageLevel.closed, '')
        },
        [setAudioState, decodedBuffer]
    )

    const onSelectRegion = useCallback(
        (start, end) => {
            if (setClickPositions)
                setClickPositions(
                    [
                        percentInSegmentToTimeInSegment(start, decodedBuffer!),
                        percentInSegmentToTimeInSegment(end, decodedBuffer!),
                    ],
                    false
                )
            playAudioPercent(start, end, setAudioState, decodedBuffer!)
            onMessage(
                Types.MessageLevel.info,
                'Selected region ' + Math.round((end - start) * 1000 * decodedBuffer!.duration) + 'ms long'
            )
        },
        [setAudioState, decodedBuffer]
    )

    const svgStyles = useRef<React.CSSProperties[]>([])

    // @ts-ignore
    return (
        <div className="spectrogram-with-annotations" style={containerStyle}>
            {_.map(workers, (worker, n) => {
                /* TODO This is wasteful, but not the end of the world */
                if (workers && svgStyles.current.length !== workers.length) {
                    svgStyles.current = _.map(workers, (worker, n) => {
                        let style = _.clone(spectrogramAnnotationStyle)
                        style.height = 85 / workers.length + '%'
                        style.top = (n * 85) / workers.length + '%'
                        return style
                    })
                }
                return (
                    <AnnotationLayer
                        key={worker}
                        label={worker}
                        editable={false}
                        svgStyle={svgStyles.current[n]}
                        annotations={annotations[worker]}
                        startTime={startTime}
                        endTime={endTime}
                        buffer={decodedBuffer}
                        color={_.includes(users, worker) ? 'rgb(135, 208, 104)' : 'DodgerBlue'}
                        colorSelected={'rgb(250, 140, 22)'}
                        selectable={true}
                        onWordClicked={onWordClickedFn}
                        onBackgroundDrag={onBackgroundDragFn}
                        onBackgroundDragStart={onBackgroundDragStartFn}
                        onBackgroundDragEnd={onBackgroundDragEndFn}
                        onInteract={onInteractFn}
                        isUser={_.includes(users, worker)}
                    />
                )
            })}
            <Waveform decodedBuffer={decodedBuffer} canvasStyle={waveformStyle} ref={waveformRef}></Waveform>
            <Timeline
                svgStyle={timelineStyle}
                ref={timelineRef}
                startTime={startTime}
                endTime={endTime}
                orientation={'bottom'}
                labelHeightPecent={'50%'}
            />
            <Spectrogram
                canvasStyle={spectrogramStyle}
                src={apihost + 'api/static/spectrograms/' + Types.movieLocation(movie, startTime, endTime) + '.jpg'}
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
                bufferNormal={rawAudioBufferNormal}
                bufferHalf={rawAudioBufferHalf}
                playKey={audioState.playKey}
                playState={audioState.playState}
                startTime={audioState.startTime}
                endTime={audioState.endTime}
                playbackRate={audioState.playbackRate}
                onStart={() => null}
                onEnd={() => clearAudioPosition(positionRef)}
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
