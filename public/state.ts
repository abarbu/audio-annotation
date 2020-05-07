let guiRevision: string | null = null
const preloadSegments = true

let splitHeight = _.isUndefined($.url().param().splitHeight) ? true : $.url().param().splitHeight

var loading: LoadingState = LoadingState.ready

var viewer_width: number
var viewer_height: number
var viewer_border = 0

const canvas = <HTMLCanvasElement>$('#canvas')[0]!
const ctx = canvas.getContext('2d')!

const waveformCanvas = <HTMLCanvasElement>$('#waveform')[0]!
const waveformCtx = waveformCanvas.getContext('2d')!

var endTime = 100000 // infinity seconds..

var context: AudioContext | null = null

var segment: string
var startS: number
var endS: number
var movieName: string
var bufferKind: BufferType
// Fetched based on the segment
var words: string[] = []
var mode: string
var token: string
var browser = navigator.userAgent.toString()
var other_annotations_by_worker: { [name: string]: Annotation[] } = {} // previous_annotation
// TODO Should expose this so that we can change the default
var current_reference_annotation = $.url().param().defaultReference

// This has a race condition between stopping and start the audio, that's why we
// have a counter. 'onended' is called after starting a new audio playback,
// because the previous playback started.
var audioIsPlaying = 0

// For the transcript pane
var editingTranscriptMode = false

var buffers: Buffers = { normal: null, half: null }
var sourceNode: AudioBufferSourceNode
var javascriptNode: ScriptProcessorNode
var startTime: TimeInBuffer = to(0)
var startOffset: TimeInBuffer = to(0)
var lastClick: TimeInMovie | null = null
var selected: number | null = null
var annotations: Annotation[] = []
var mute: boolean = false
const keyboardShiftOffset: TimeInMovie = to(0.01)
const handleOffset = 0

let dragStart: TimeInMovie | null = null
var svg = d3.select('#d3')
svg
    .append('rect')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('fill', '#ffffff')
    .attr('fill-opacity', 0.0)
    .call(
        d3.behavior
            .drag()
            .on('dragstart', () => {
                // @ts-ignore
                recordMouseClick(d3.event.sourceEvent, "#d3", "dragstart")
                // @ts-ignore
                const x = d3.event.sourceEvent.layerX
                lastClick = positionToAbsoluteTime(to<PositionInSpectrogram>(x))
                dragStart = lastClick
                redraw()
            })
            .on('dragend', () => {
                // @ts-ignore
                recordMouseClick(d3.event.sourceEvent, "d3", "dragend")
                // @ts-ignore
                const x = d3.event.sourceEvent.layerX
                // @ts-ignore
                const shift: bool = d3.event.sourceEvent.shiftKey
                lastClick = positionToAbsoluteTime(to<PositionInSpectrogram>(x))
                const boundary1: TimeInMovie = dragStart!
                const boundary2: TimeInMovie = lastClick!
                dragStart = null
                let start: TimeInMovie
                let end: TimeInMovie
                if (Math.abs(from(sub(boundary1!, boundary2!))) > 0.02) {
                    if (from(sub(boundary1!, boundary2)) < 0) {
                        start = boundary1!
                        end = boundary2!
                    } else {
                        start = boundary2!
                        end = boundary1!
                    }
                } else {
                    start = lastClick
                    if (shift) {
                        end = to<TimeInMovie>(endS)
                    } else {
                        end = to<TimeInMovie>(Math.min(from(start) + from(defaultPlayLength()), endS))
                    }
                }
                clear()
                stopPlaying()
                setup(buffers[bufferKind]!)
                play(timeInMovieToTimeInBuffer(start), sub(timeInMovieToTimeInBuffer(end), timeInMovieToTimeInBuffer(start)))
                redraw()
            })
            .on('drag', () => {
                // @ts-ignore
                const x = d3.event.sourceEvent.layerX
                lastClick = positionToAbsoluteTime(to<PositionInSpectrogram>(x))
                redraw()
            })
    )

var svgReferenceAnnotations: d3.Selection<SVGElement> = svg.append('g')
var svgAnnotations: d3.Selection<SVGElement> = svg.append('g')
let lastChangedAnnotations: Annotation[] = []

var fixedButtonOffset = 0.05
