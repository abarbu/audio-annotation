import React from 'react'
import * as Types from './Types'
import * as _ from 'lodash'
import queryString from 'query-string'

export default interface State {
    guiRevision: string | null
    loading: Types.LoadingState
    movieName: number | null
    segmentStartTime: number | null
    segmentEndTime: number | null
    worker: string | null
    referenceAnnotations: { [name: string]: Types.Annotation[] }
    defaultReferenceWorker: string | null
    annotations: Types.Annotation[]
    words: string[]
    lastClick: Types.TimeInMovie | null
    selected: number | null
    keyboardShiftOffset: Types.TimeInMovie
    fixedButtonOffset: number
}

export const initialState: State = {
    guiRevision: null,
    loading: Types.LoadingState.ready,
    movieName: null,
    segmentStartTime: null,
    segmentEndTime: null,
    referenceAnnotations: {},
    worker: null,
    defaultReferenceWorker: null,
    annotations: [],
    words: [],
    lastClick: null,
    selected: null,
    keyboardShiftOffset: Types.to(0.01),
    fixedButtonOffset: 0.05,
}

/*
 * let guiRevision: string | null = null
 * const preloadSegments = true
 *  */
/* TODO */
/* let splitHeight = _.isUndefined($.url().param().splitHeight)
 *     ? true
 *     : $.url().param().splitHeight; */
/*
 *  */
/*
 * var viewer_width: number
 * var viewer_height: number
 * var viewer_border = 0
 *  */
/* TODO */
/* const canvas = <HTMLCanvasElement>$("#canvas")[0]!;
 * const ctx = canvas.getContext("2d")!; */

/* TODO */
/* const waveformCanvas = <HTMLCanvasElement>$("#waveform")[0]!;
 * const waveformCtx = waveformCanvas.getContext("2d")!; */

/*
 * var endTime = 100000 // infinity seconds..
 * var context: AudioContext | null = null
 * var segment: string
 * var startS: number
 * var endS: number
 * var movieName: string
 * var bufferKind: Types.BufferType // now audioSpeed
 *  */

// Fetched based on the segment

/* var words: string[] = []
 * var mode: string
 * var token: string
 * var browser = navigator.userAgent.toString()
 * var other_annotations_by_worker: { [name: string]: Types.Annotation[] } = {} // previous_annotation */ // referenceAnnotations

// TODO Should expose this so that we can change the default
/* var current_reference_annotation = $.url().param().defaultReference */

// This has a race condition between stopping and start the audio, that's why we
// have a counter. 'onended' is called after starting a new audio playback,
// because the previous playback started.
/* var audioIsPlaying = 0 */

// For the transcript pane

/* var editingTranscriptMode = false */

/*
 * var buffers: Types.Buffers = { normal: null, half: null }
 * var sourceNode: AudioBufferSourceNode
 * var javascriptNode: ScriptProcessorNode
 * var startTime: Types.TimeInBuffer = Types.to(0)
 * var startOffset: Types.TimeInBuffer = Types.to(0)
 * var lastClick: Types.TimeInMovie | null = null
 * var selected: number | null = null
 * var annotations: Types.Annotation[] = []
 * var mute: boolean = false
 * const keyboardShiftOffset: Types.TimeInMovie = Types.to(0.01)
 * const handleOffset = 0
 * let dragStart: Types.TimeInMovie | null = null */

/* var svg = d3.select('#d3')
 * svg
 *     .append('rect')
 *     .attr('width', '100%')
 *     .attr('height', '100%')
 *     .attr('fill', '#ffffff')
 *     .attr('fill-opacity', 0.0)
 *     .call(
 *         d3.behavior
 *             .drag()
 *             .on('dragstart', () => {
 *                 // @ts-ignore
 *                 recordMouseClick(d3.event.sourceEvent, '#d3', 'dragstart')
 *                 // @ts-ignore
 *                 const x = d3.event.sourceEvent.layerX
 *                 lastClick = positionToAbsoluteTime(to<PositionInSpectrogram>(x))
 *                 dragStart = lastClick
 *                 redraw()
 *             })
 *             .on('dragend', () => {
 *                 // @ts-ignore
 *                 recordMouseClick(d3.event.sourceEvent, 'd3', 'dragend')
 *                 // @ts-ignore
 *                 const x = d3.event.sourceEvent.layerX
 *                 // @ts-ignore
 *                 const shift: bool = d3.event.sourceEvent.shiftKey
 *                 lastClick = positionToAbsoluteTime(to<PositionInSpectrogram>(x))
 *                 const boundary1: TimeInMovie = dragStart!
 *                 const boundary2: TimeInMovie = lastClick!
 *                 dragStart = null
 *                 let start: TimeInMovie
 *                 let end: TimeInMovie
 *                 if (Math.abs(from(sub(boundary1!, boundary2!))) > 0.02) {
 *                     if (from(sub(boundary1!, boundary2)) < 0) {
 *                         start = boundary1!
 *                         end = boundary2!
 *                     } else {
 *                         start = boundary2!
 *                         end = boundary1!
 *                     }
 *                 } else {
 *                     start = lastClick
 *                     if (shift) {
 *                         end = to<TimeInMovie>(endS)
 *                     } else {
 *                         end = to<TimeInMovie>(Math.min(from(start) + from(defaultPlayLength()), endS))
 *                     }
 *                 }
 *                 clear()
 *                 stopPlaying()
 *                 setup(buffers[bufferKind]!)
 *                 play(timeInMovieToTimeInBuffer(start), sub(timeInMovieToTimeInBuffer(end), timeInMovieToTimeInBuffer(start)))
 *                 redraw()
 *             })
 *             .on('drag', () => {
 *                 // @ts-ignore
 *                 const x = d3.event.sourceEvent.layerX
 *                 lastClick = positionToAbsoluteTime(to<PositionInSpectrogram>(x))
 *                 redraw()
 *             })
 *     ) */

/*
 * var svgReferenceAnnotations: d3.Selection<SVGElement> = svg.append('g')
 * var svgAnnotations: d3.Selection<SVGElement> = svg.append('g')
 * let lastChangedAnnotations: Annotation[] = []
 * var fixedButtonOffset = 0.05 */

/*
 * export const Store = React.createContext();
 *
 * function reducer(state, action) {
 *     switch (action.type) {
 *         case "FETCH_DATA":
 *             return {...state, episodes: action.payload };
 *         case "ADD_FAV":
 *             return {
 *                 ...state,
 *                 favourites: [...state.favourites, action.payload]
 *             };
 *         case "REMOVE_FAV":
 *             return {
 *                 ...state,
 *                 favourites: action.payload
 *             };
 *         default:
 *             return state;
 *     }
 * }
 *
 * export function StoreProvider(props) {
 *     const [state, dispatch] = React.useReducer(reducer, initialState);
 *     const value = {state, dispatch};
 *     return <Store.Provider value={value}>{props.children}</Store.Provider>;
 * } */
