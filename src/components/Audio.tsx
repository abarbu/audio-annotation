import { useEffect, useRef, MutableRefObject } from 'react'
import * as Types from '../Types'

export function percentInSegmentToTimeInSegment(p: Types.PercentInSegment, buffer: AudioBuffer): Types.TimeInSegment {
    return Types.to(Types.from(p) * buffer.duration)
}

export function timeInSegmentToPercentInSegment(p: Types.TimeInSegment, buffer: AudioBuffer): Types.PercentInSegment {
    return Types.to(Types.from(p) / buffer.duration)
}

function setup(
    buffer: AudioBuffer,
    context: AudioContext,
    javascriptNode: ScriptProcessorNode,
    audioStoppedPlaying: () => any,
    sourceNode: MutableRefObject<AudioBufferSourceNode | null>
) {
    let sn = context.createBufferSource()
    sn.connect(javascriptNode)
    sn.buffer = buffer
    sn.onended = () => {
        audioStoppedPlaying()
    }
    sn.connect(context.destination)
    sourceNode.current = sn
}

function stopPlaying(
    sourceNode: MutableRefObject<AudioBufferSourceNode | null>,
    context: AudioContext,
    javascriptNode: MutableRefObject<ScriptProcessorNode | null>
) {
    javascriptNode.current!.disconnect(context.destination)
    sourceNode.current!.stop(0)
}

function play(
    sourceNode: AudioBufferSourceNode,
    context: AudioContext,
    javascriptNode: MutableRefObject<ScriptProcessorNode | null>,
    globalStartTime: MutableRefObject<number>,
    audioStartedPlaying: () => any,
    startTime_: Types.TimeInSegment,
    endTime: Types.TimeInSegment | null
) {
    const startTime = Types.from(startTime_)
    audioStartedPlaying()
    javascriptNode.current!.connect(context.destination)
    // NB: We prented that the audio started playing in the past so that all computations based off of the start time work correctly
    globalStartTime.current = context.currentTime - Math.max(0, startTime)
    if (endTime) {
        // Math.max is required for .start() because we have segments that start before our audio does
        sourceNode.start(0, Math.max(0, startTime), Types.from(endTime) - startTime)
    } else {
        // Math.max is required for .start() because we have segments that start before our audio does
        sourceNode.start(0, Math.max(0, startTime))
    }
}

function audioStoppedPlaying(
    onEnd: (time: Types.TimeInSegment, percentOffset: Types.PercentInSegment) => any,
    audioIsPlaying: MutableRefObject<number>,
    context: AudioContext,
    buffer: AudioBuffer,
    globalStartTime: MutableRefObject<number>,
    javascriptNode: MutableRefObject<ScriptProcessorNode | null>,
    sourceNode: AudioBufferSourceNode
) {
    let time = Types.to<Types.TimeInSegment>(context.currentTime - globalStartTime.current)
    onEnd(time, timeInSegmentToPercentInSegment(time, buffer))
    audioIsPlaying.current -= 1
    if (audioIsPlaying.current <= 0)
        try {
            javascriptNode.current!.disconnect(context.destination)
            sourceNode.stop(0)
        } catch (err) {
            // TODO Is it possible for this to happen?
            console.log('Stopping audio resulted in non-fatal error', err)
        }
}

function audioStartedPlaying(
    onStart: (time: Types.TimeInSegment, percentOffset: Types.PercentInSegment) => any,
    audioIsPlaying: MutableRefObject<number>,
    context: AudioContext,
    buffer: AudioBuffer,
    globalStartTime: MutableRefObject<number>
) {
    let time = Types.to<Types.TimeInSegment>(context.currentTime - globalStartTime.current)
    onStart(time, timeInSegmentToPercentInSegment(time, buffer))
    audioIsPlaying.current += 1
}

function isAudioPlaying(audioIsPlaying: MutableRefObject<number>) {
    return audioIsPlaying.current > 0
}

/* eslint-disable react-hooks/exhaustive-deps */

export interface AudioState {
    playKey: number
    playState: boolean
    startTime: Types.TimeInSegment
    endTime: Types.TimeInSegment | null
}

export const initialAudioState: AudioState = {
    playKey: 0,
    playState: false,
    startTime: Types.to(0),
    endTime: null,
}

export function playAudio(
    start: Types.TimeInSegment,
    end: Types.TimeInSegment | null,
    setFn: (value: React.SetStateAction<AudioState>) => void
) {
    setFn(prev => ({
        playKey: prev.playKey + 1,
        playState: true,
        startTime: start,
        endTime: end,
    }))
}

export function playAudioInMovie(
    start: Types.TimeInMovie,
    end: Types.TimeInMovie | null,
    setFn: (value: React.SetStateAction<AudioState>) => void,
    startTime: Types.TimeInMovie
) {
    setFn(prev => ({
        playKey: prev.playKey + 1,
        playState: true,
        startTime: Types.timeInMovieToTimeInSegment(start, startTime),
        endTime: end ? Types.timeInMovieToTimeInSegment(end, startTime) : null,
    }))
}

export function playAudioPercent(
    start: Types.PercentInSegment,
    end: Types.PercentInSegment | null,
    setFn: (value: React.SetStateAction<AudioState>) => void,
    buffer: AudioBuffer
) {
    playAudio(
        percentInSegmentToTimeInSegment(start, buffer),
        end === null ? null : percentInSegmentToTimeInSegment(end, buffer),
        setFn
    )
}

export function stopAudio(setFn: (value: React.SetStateAction<AudioState>) => void) {
    setFn(prev => ({
        playKey: prev.playKey + 1,
        playState: false,
        startTime: prev.startTime,
        endTime: prev.endTime,
    }))
}

export default function Audio({
    buffer /* Update this to load new audio */,
    playKey = 0,
    playState = false,
    startTime = Types.to(0),
    endTime = null,
    onStart = () => 0,
    onEnd = () => 0,
    onAsyncPlaySample = () => 0,
    onSyncPlaySample = () => 0,
    callbackEveryNSeconds = 0.01,
    onDecode = () => 0,
    onDecodeError = () => 0,
}: {
    buffer: null | ArrayBuffer
    playKey: number
    playState: boolean
    startTime: Types.TimeInSegment
    endTime: Types.TimeInSegment | null
    onStart?: (time: Types.TimeInSegment, percentOffset: Types.PercentInSegment) => any
    onEnd?: (time: Types.TimeInSegment, percentOffset: Types.PercentInSegment) => any
    /* mute: boolean */
    onAsyncPlaySample?: (time: Types.TimeInSegment, percentOffset: Types.PercentInSegment) => any
    onSyncPlaySample?: (time: Types.TimeInSegment, percentOffset: Types.PercentInSegment, ev: AudioProcessingEvent) => any
    callbackEveryNSeconds: number
    onDecode?: (buf: AudioBuffer) => any
    onDecodeError?: (err: any) => any
}) {
    const context = useRef(null as null | AudioContext)
    const javascriptNode = useRef(null as null | ScriptProcessorNode)
    const sourceNode = useRef(null as null | AudioBufferSourceNode)
    const audioBuffer = useRef(null as null | AudioBuffer)
    const audioIsPlaying = useRef(0)
    const globalStartTime = useRef(-1)
    const globalLastCallbackTime = useRef(-1)
    const lastOffsetInSegment = useRef(-1)

    useEffect(() => {
        context.current = new AudioContext()!
        let jsnode = context.current.createScriptProcessor(
            Math.pow(2, Math.ceil(Math.log(context.current.sampleRate * callbackEveryNSeconds) / Math.log(2))),
            1,
            1
        )
        jsnode!.onaudioprocess = function(audioProcessingEvent) {
            // TODO We should measure and report the latency between sourceNode.current!.buffer!.duration
            // and context.currentTime - globalStartTime.current
            // On my machine this is 0.006s ~ 6ms
            // All callbacks will have this built into them
            lastOffsetInSegment.current = context.current!.currentTime - globalStartTime.current
            if (
                globalLastCallbackTime.current + callbackEveryNSeconds <= context.current!.currentTime &&
                audioBuffer.current
            ) {
                globalLastCallbackTime.current = context.current!.currentTime
                const time = Types.to<Types.TimeInSegment>(context.current!.currentTime - globalStartTime.current)
                onSyncPlaySample(time, timeInSegmentToPercentInSegment(time, audioBuffer.current), audioProcessingEvent)
            }
        }
        javascriptNode.current = jsnode
        return () => {
            if (isAudioPlaying(audioIsPlaying)) stopPlaying(sourceNode, context.current!, javascriptNode)
        }
    }, [])

    useEffect(() => {
        if (context.current && javascriptNode && buffer) {
            if (isAudioPlaying(audioIsPlaying)) stopPlaying(sourceNode, context.current!, javascriptNode)
            context.current.decodeAudioData(
                buffer,
                function(decoded) {
                    onDecode(decoded)
                    audioBuffer.current = decoded
                },
                onDecodeError
            )
        }
    }, [buffer])

    useEffect(() => {
        if (audioBuffer.current) {
            if (endTime && Types.from(startTime) > Types.from(endTime))
                throw 'The start time must be smaller than the end time'
            if (isAudioPlaying(audioIsPlaying)) stopPlaying(sourceNode, context.current!, javascriptNode)
            if (playState) {
                let localTimerId = { value: null as any }
                let startedFn = () => {
                    audioStartedPlaying(onStart, audioIsPlaying, context.current!, audioBuffer.current!, globalStartTime)
                    localTimerId.value = setInterval(() => {
                        if (audioBuffer.current) {
                            const time = Types.to<Types.TimeInSegment>(lastOffsetInSegment.current)
                            onAsyncPlaySample(time, timeInSegmentToPercentInSegment(time, audioBuffer.current))
                        }
                    }, callbackEveryNSeconds * 1000)
                }
                let stoppedFn = () => {
                    if (localTimerId.value > 0) clearInterval(localTimerId.value)
                    audioStoppedPlaying(
                        onEnd,
                        audioIsPlaying,
                        context.current!,
                        audioBuffer.current!,
                        globalStartTime,
                        javascriptNode,
                        sourceNode.current!
                    )
                }
                setup(audioBuffer.current, context.current!, javascriptNode.current!, stoppedFn, sourceNode)
                play(sourceNode.current!, context.current!, javascriptNode, globalStartTime, startedFn, startTime, endTime)
            }
        }
    }, [playKey, playState, startTime, endTime, audioBuffer])

    return null
}