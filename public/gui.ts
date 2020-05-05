// TODO Automatic UI sizing
// TODO End of movie
// TODO Will this work on my phone?
// TODO No words inside other words
// TODO Previous page for annotating words
// TODO Metrics (cliks, locations, ?, words annotated)
// TODO submit should check for missing internal words
// TODO Unique ID generation
// TODO HIT Information in the submission, like ID number, etc
// TODO check word order
// TODO Wider spectrograms
// TODO Maybe test for audio somehow before the person is qualified for the HIT
// TODO If we haven't loaded in 30 seconds, do something about it

// Sounds: I think we should annotate these separately
// music
// explosion
// gunshot
// nature
// talking
// vehicle
// singing
// shouting
// phone
// laugh
// crash
// steps

const preloadSegments = true
let parameters = $.url().param()
let splitHeight = _.isUndefined(parameters.splitHeight) ? true : parameters.splitHeight

function heightBottom(isReference: boolean) {
  if (splitHeight) {
    if (isReference) {
      return '90%'
    } else {
      return '0%'
    }
  } else {
    return '0%'
  }
}

function heightTop(isReference: boolean) {
  if (splitHeight) {
    if (isReference) {
      return '100%'
    } else {
      return '90%'
    }
  } else {
    return '100%'
  }
}

function heightText(isReference: boolean) {
  if (splitHeight) {
    if (isReference) {
      return '98%'
    } else {
      return '47%'
    }
  } else {
    if (isReference) {
      return '55%'
    } else {
      return '47%'
    }
  }
}

function heightTopLine(isReference: boolean) {
  if (splitHeight) {
    if (isReference) {
      return '93%'
    } else {
      return '50%'
    }
  } else {
    return '50%'
  }
}

// https://www.everythingfrontend.com/posts/newtype-in-typescript.html
type TimeInBuffer = { value: number; readonly __tag: unique symbol }
type TimeInSegment = { value: number; readonly __tag: unique symbol }
type TimeInMovie = { value: number; readonly __tag: unique symbol }
type PositionInSpectrogram = { value: number; readonly __tag: unique symbol }

function add<T extends { readonly __tag: symbol; value: number }>(t1: T, t2: T): T {
  return lift2<T>(t1, t2, (a, b) => a + b)
}

function sub<T extends { readonly __tag: symbol; value: number }>(t1: T, t2: T): T {
  return lift2<T>(t1, t2, (a, b) => a - b)
}

function addConst<T extends { readonly __tag: symbol; value: number }>(t: T, c: number): T {
  return lift<T>(t, a => a + c)
}

function subConst<T extends { readonly __tag: symbol; value: number }>(t: T, c: number): T {
  return lift<T>(t, a => a - c)
}

function addMin<T extends { readonly __tag: symbol; value: number }>(t1: T, t2: T, t3: T): T {
  return lift3<T>(t1, t2, t3, (a, b, c) => Math.min(a + b, c))
}

function subMax<T extends { readonly __tag: symbol; value: number }>(t1: T, t2: T, t3: T): T {
  return lift3<T>(t1, t2, t3, (a, b, c) => Math.max(a - b, c))
}

function to<T extends { readonly __tag: symbol; value: any } = { readonly __tag: unique symbol; value: never }>(
  value: T['value']
): T {
  return (value as any) as T
}

function from<T extends { readonly __tag: symbol; value: any }>(value: T): T['value'] {
  return (value as any) as T['value']
}

function lift<T extends { readonly __tag: symbol; value: any }>(
  value: T,
  callback: (value: T['value']) => T['value']
): T {
  return callback(value)
}

function lift2<T extends { readonly __tag: symbol; value: any }>(
  x: T,
  y: T,
  callback: (x: T['value'], y: T['value']) => T['value']
): T {
  return callback(x, y)
}

function lift3<T extends { readonly __tag: symbol; value: any }>(
  x: T,
  y: T,
  z: T,
  callback: (x: T['value'], y: T['value'], z: T['value']) => T['value']
): T {
  return callback(x, y, z)
}

interface Annotation {
  word: string
  index: number
  startTime?: TimeInMovie
  endTime?: TimeInMovie
  lastClickTimestamp?: number
  id?: string | number
  visuals?: Visuals
}

interface Visuals {
  group: d3.Selection<SVGElement>
  text: d3.Selection<SVGElement>
  startLine: d3.Selection<SVGElement>
  startLineHandle: d3.Selection<SVGElement>
  endLine: d3.Selection<SVGElement>
  endLineHandle: d3.Selection<SVGElement>
  filler: d3.Selection<SVGElement>
  topLine: d3.Selection<SVGElement>
}

interface Buffers {
  normal: null | AudioBuffer
  half: null | AudioBuffer
}

enum BufferType {
  normal = 'normal',
  half = 'half',
}

enum DragPosition {
  start = 'startTime',
  end = 'endTime',
  both = 'both',
}

// Some global extensions

interface JQueryStatic {
  url: any
}
interface JQuery {
  bootstrapSwitch: any
}
interface AudioBufferSourceNode {
  playbackState: any
  PLAYING_STATE: any
}

function isValidAnnotation(a: Annotation) {
  return (
    _.has(a, 'startTime') &&
    !_.isUndefined(a.startTime) &&
    !_.isNull(a.startTime) &&
    _.has(a, 'endTime') &&
    !_.isUndefined(a.endTime) &&
    !_.isNull(a.endTime)
  )
}

// https://gist.github.com/aaronk6/bff7cc600d863d31a7bf
/**
 * Register ajax transports for blob send/recieve and array buffer send/receive via XMLHttpRequest Level 2
 * within the comfortable framework of the jquery ajax request, with full support for promises.
 *
 * Notice the +* in the dataType string? The + indicates we want this transport to be prepended to the list
 * of potential transports (so it gets first dibs if the request passes the conditions within to provide the
 * ajax transport, preventing the standard transport from hogging the request), and the * indicates that
 * potentially any request with any dataType might want to use the transports provided herein.
 *
 * Remember to specify 'processData:false' in the ajax options when attempting to send a blob or arraybuffer -
 * otherwise jquery will try (and fail) to convert the blob or buffer into a query string.
 */
$.ajaxTransport('+*', function (options, _originalOptions, jqXHR) {
  // Test for the conditions that mean we can/want to send/receive blobs or arraybuffers - we need XMLHttpRequest
  // level 2 (so feature-detect against window.FormData), feature detect against window.Blob or window.ArrayBuffer,
  // and then check to see if the dataType is blob/arraybuffer or the data itself is a Blob/ArrayBuffer
  if (
    FormData &&
    ((options.dataType && (options.dataType === 'blob' || options.dataType === 'arraybuffer')) ||
      (options.data &&
        ((window.Blob && options.data instanceof Blob) || (ArrayBuffer && options.data instanceof ArrayBuffer))))
  ) {
    return {
      /**
       * Return a transport capable of sending and/or receiving blobs - in this case, we instantiate
       * a new XMLHttpRequest and use it to actually perform the request, and funnel the result back
       * into the jquery complete callback (such as the success function, done blocks, etc.)
       *
       * @param headers
       * @param completeCallback
       */
      send: function (headers, completeCallback) {
        var xhr = new XMLHttpRequest(),
          url = options.url || window.location.href,
          type = options.type || 'GET',
          dataType = options.dataType || 'text',
          data = options.data || null,
          async = options.async || true,
          key

        xhr.addEventListener('load', function () {
          var response = <any>{},
            isSuccess

          isSuccess = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 304

          if (isSuccess) {
            response[dataType] = xhr.response
          } else {
            // In case an error occured we assume that the response body contains
            // text data - so let's convert the binary data to a string which we can
            // pass to the complete callback.
            response.text = String.fromCharCode.apply(
              null,
              // @ts-ignore
              new Uint8Array(xhr.response)
            )
          }

          // @ts-ignore
          completeCallback(xhr.status, xhr.statusText, response, xhr.getAllResponseHeaders())
        })

        xhr.open(type, url, async)
        // @ts-ignore
        xhr.responseType = dataType

        for (key in headers) {
          if (headers.hasOwnProperty(key)) xhr.setRequestHeader(key, headers[key])
        }
        // @ts-ignore
        xhr.send(data)
      },
      abort: function () {
        jqXHR.abort()
      },
    }
  }
})

var loading = false

var viewer_width: number
var viewer_height: number
var viewer_border = 0

const canvas = <HTMLCanvasElement>$('#canvas')[0]!
const ctx = canvas.getContext('2d')!

function clickOnCanvas() {
  clear()
  stopPlaying()
  setup(buffers[bufferKind]!)
  lastClick = positionToAbsoluteTime(to<PositionInSpectrogram>(mousePosition().x))
  // @ts-ignore
  play(timeInMovieToTimeInBuffer(lastClick), d3.event.shiftKey ? endS - startS : defaultPlayLength())
}

function resizeCanvas() {
  viewer_width = Math.min($('.panel').width()!, 3000) // 2240 // 1200
  viewer_height = Math.min(window.innerHeight * 0.5, 800) // 830 // 565
  viewer_border = 0
  canvas.width = viewer_width
  canvas.height = viewer_height
  $('#d3')
    .attr('width', viewer_width)
    .attr('height', viewer_height + viewer_border)
  $('#container')
    .css('width', viewer_width)
    .css('height', viewer_height + viewer_border)
}

resizeCanvas()

// $('#canvas').click(clickOnCanvas)

$(window).resize(() => {
  stop()
  resizeCanvas()
})

var endTime = 100000 // infinity seconds..

if (AudioContext) {
  var context = new AudioContext()
} else {
  $('#loading').html(
    '<h1><span class="label label-danger">Can\'t load audio context! Please use a recent free browser like the latest Chrome or Firefox.</span><h1>'
  )
}

function setupAudioNodes() {
  javascriptNode = context.createScriptProcessor(256, 1, 1)
  javascriptNode.connect(context.destination)
}

setupAudioNodes()

function message(kind: string, msg: string) {
  $('#loading')
    .html('<h4><div class="alert alert-' + kind + '">' + msg + '</span></h4>')
    .removeClass('invisible')
}

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
var current_reference_annotation = parameters.defaultReference
var references =
    // TODO Legacy, remove 'references' and keep repeated 'reference'
    _.concat(_.isUndefined(parameters.references) ? [] : _.split(parameters.references, ',')
            ,_.isUndefined(parameters.reference) ? [] : _.split(parameters.reference, ' '))

// This has a race condition between stopping and start the audio, that's why we
// have a counter. 'onended' is called after starting a new audio playback,
// because the previous playback started.
var audioIsPlaying = 0

// For the transcript pane
var editingTranscriptMode = false

function parseSegment(segmentName: string) {
  const s = segmentName.split(':')
  return { movieName: s[0], startTime: parseFloat(s[1]), endTime: parseFloat(s[2]) }
}

function segmentString(details: { movieName: string; startTime: number; endTime: number }) {
  return mkSegmentName(details.movieName, details.startTime, details.endTime)
}

function setSegment(segmentName: string) {
  const s = segmentName.split(':')
  segment = segmentName
  movieName = s[0]
  startS = parseFloat(s[1])
  endS = parseFloat(s[2])
}

// TODO Check all properties here
// TODO disable the default at some point
if (parameters.token) {
  token = parameters.token
  $.ajax({
    type: 'POST',
    data: JSON.stringify({ token: parameters.token }),
    contentType: 'application/json',
    async: false,
    url: '/details',
    success: function (data) {
      if (data.response != 'ok') {
        message('danger', 'Bad token!')
        throw 'bad-token'
      }
      setSegment(data.segment)
    },
  })
} else {
  if (parameters.segment) setSegment(parameters.segment)
  else setSegment('test:0:1')
}

if (parameters.nohelp) $('#help-panel').remove()

function keyboardShortcutsOn() {
  $(document).bind('keydown', 'l', () => {
    $('#play').click()
  })
  $(document).bind('keydown', 't', () => {
    $('#stop').click()
  })
  $(document).bind('keydown', 'e', () => {
    $('#end-word').click()
  })
  $(document).bind('keydown', 'd', () => {
    $('#delete-selection').click()
  })
  $(document).bind('keydown', 'y', () => {
    $('#play-selection').click()
  })
  $(document).bind('keydown', 'w', () => {
    $('#start-next-word').click()
  })
  $(document).bind('keydown', 'shift+W', () => {
    $('#start-next-word-after-previous').click()
  })
  $(document).bind('keydown', 'a', () => {
    $('#toggle-speed').bootstrapSwitch('toggleState')
  })
  $(document).bind('keydown', 'm', () => {
    $('#toggle-audio').bootstrapSwitch('toggleState')
  })
  $(document).bind('keydown', 'b', () => {
    $('#back-save-2-sec').click()
  })
  $(document).bind('keydown', 'f', () => {
    $('#forward-save-2-sec').click()
  })
  $(document).bind('keydown', 's', () => {
    $('#submit').click()
  })
  $(document).bind('keydown', 'r', () => {
    $('#fill-with-reference').click()
  })
  $(document).bind('keydown', 't', e => {
    $('#edit-transcript').click()
    if (selected != null) {
      const n = _.sum(
        _.map(
          _.filter(annotations, a => a.index < selected!),
          a => a.word.length + 1
        )
      )
      // @ts-ignore
      $('#transcript-input').focus()[0].setSelectionRange(n, n)
    } else {
      $('#transcript-input').focus()
    }
    e.preventDefault()
  })
  $(document).bind('keydown', 'left', () => {
    if (selected == null) {
      const lastAnnotation = _.last(_.filter(annotations, isValidAnnotation))
      if (lastAnnotation) {
        selectWord(lastAnnotation)
        $('#play-selection').click()
      } else {
        message('warning', "Can't select the last word: no words are annotated")
        return
      }
    } else {
      const nextAnnotation = _.last(_.filter(_.take(annotations, selected), isValidAnnotation))
      if (nextAnnotation) {
        selectWord(nextAnnotation)
        $('#play-selection').click()
      } else {
        message('warning', 'At the first word, no other annotations to select')
        return
      }
    }
  })
  $(document).bind('keydown', 'right', () => {
    if (selected == null) {
      const firstAnnotation = _.head(_.filter(annotations, isValidAnnotation))
      if (firstAnnotation) {
        selectWord(firstAnnotation)
        $('#play-selection').click()
      } else {
        message('warning', "Can't select the first word: no words are annotated")
        return
      }
    } else {
      const nextAnnotation = _.head(_.filter(_.drop(annotations, selected + 1), isValidAnnotation))
      if (nextAnnotation) {
        selectWord(nextAnnotation)
        $('#play-selection').click()
      } else {
        message('warning', 'At the last word, no other annotations to select')
        return
      }
    }
  })
  $(document).bind('keydown', 'up', () => {
    $('#play-selection').click()
  })
  $(document).bind('keydown', 'down', () => {
    $('#play-selection').click()
  })
  $(document).bind('keydown', 'shift+left', () => {
    if (selected == null || !isValidAnnotation(annotations[selected])) {
      message('warning', "Can't shift the start of the word earlier; no word is selected.")
      return
    } else {
      annotations[selected].startTime = subMax(annotations[selected].startTime!, keyboardShiftOffset, to(startS))
      updateWord(annotations[selected])
    }
  })
  $(document).bind('keydown', 'shift+right', () => {
    if (selected == null || !isValidAnnotation(annotations[selected])) {
      message('warning', "Can't shift the start of the word later; no word is selected.")
      return
    } else {
      annotations[selected].startTime = addMin(
        annotations[selected].startTime!,
        keyboardShiftOffset,
        sub(annotations[selected].endTime!, keyboardShiftOffset)
      )
      updateWord(annotations[selected])
    }
  })
  $(document).bind('keydown', 'ctrl+left', () => {
    if (selected == null || !isValidAnnotation(annotations[selected])) {
      message('warning', "Can't shift the end of the word earlier; no word is selected.")
      return
    } else {
      annotations[selected].endTime = subMax(
        annotations[selected].endTime!,
        keyboardShiftOffset,
        add(annotations[selected].startTime!, keyboardShiftOffset)
      )
      updateWord(annotations[selected])
    }
  })
  $(document).bind('keydown', 'ctrl+right', () => {
    if (selected == null || !isValidAnnotation(annotations[selected])) {
      message('warning', "Can't shift the end of the word later; no word is selected.")
      return
    } else {
      annotations[selected].endTime = addMin(annotations[selected].endTime!, keyboardShiftOffset, to(endS))
      updateWord(annotations[selected])
    }
  })
  $(document).bind('keydown', 'shift+up', () => {
    if (selected == null || !isValidAnnotation(annotations[selected])) {
      message('warning', "Can't shift the word later; no word is selected.")
      return
    } else {
      annotations[selected].endTime = addMin(annotations[selected].endTime!, keyboardShiftOffset, to(endS))
      annotations[selected].startTime = addMin(
        annotations[selected].startTime!,
        keyboardShiftOffset,
        sub(annotations[selected].endTime!, keyboardShiftOffset)
      )
      updateWord(annotations[selected])
    }
  })
  $(document).bind('keydown', 'shift+down', () => {
    if (selected == null || !isValidAnnotation(annotations[selected])) {
      message('warning', "Can't shift the word earlier; no word is selected.")
      return
    } else {
      annotations[selected].endTime = subMax(
        annotations[selected].endTime!,
        keyboardShiftOffset,
        add(annotations[selected].startTime!, keyboardShiftOffset)
      )
      annotations[selected].startTime = subMax(annotations[selected].startTime!, keyboardShiftOffset, to(startS))
      updateWord(annotations[selected])
    }
  })
}

function tokenMode() {
  stopPlaying()
  mode = 'token'
  bufferKind = BufferType.normal
  $('.transcription-gui').addClass('display-none')
  $('.annotation-gui').addClass('display-none')
  // TOOD Maybe ressurect this one day?
  // keyboardShortcutsOff()
}

function annotationMode() {
  mode = 'annotation'
  bufferKind = BufferType.normal
  $('.transcription-gui').addClass('display-none')
  $('.annotation-gui').removeClass('display-none')
  keyboardShortcutsOn()
  // TODO This is blocked by browsers anyway
  // if(sourceNode) {
  //     stopPlaying()
  //     play(0)
  // }
}

annotationMode()

// delay between hearing a word, figuring out that it's the one
// you want, pressing the button and the event firing
var fixedButtonOffset = 0.05
function defaultPlayLength(): TimeInBuffer {
  switch (bufferKind) {
    case BufferType.half:
      return to(1.4)
    case BufferType.normal:
      return to(0.7)
  }
}

var buffers: Buffers = { normal: null, half: null }
var sourceNode: AudioBufferSourceNode
var javascriptNode: ScriptProcessorNode
var startTime: TimeInBuffer = to(0)
var startOffset: TimeInBuffer = to(0)
var lastClick: TimeInMovie | null = null
var selected: number | null = null
var annotations: Annotation[]
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
        const x = d3.event.sourceEvent.layerX
        lastClick = positionToAbsoluteTime(to<PositionInSpectrogram>(x))
        dragStart = lastClick
        redraw()
      })
      .on('dragend', () => {
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

function pushUndo(annotation: Annotation) {
  lastChangedAnnotations.push(_.clone(annotation))
}

function popUndo() {
  const last = _.last(lastChangedAnnotations)
  lastChangedAnnotations = lastChangedAnnotations.slice(0, -1)
  return last
}

function clearUndo() {
  lastChangedAnnotations = []
}

function undo() {
  if (lastChangedAnnotations != []) {
    const ann = popUndo()!
    annotations[ann.index].startTime = ann.startTime
    annotations[ann.index].endTime = ann.endTime
    updateWord(annotations[ann.index])
  } else {
    message('warning', 'Nothing to undo')
  }
}

svgReferenceAnnotations.on('click', function (_d, _i) {
  clickOnCanvas()
})

svgAnnotations.on('click', function (_d, _i) {
  clickOnCanvas()
})

function drag(annotation: Annotation, position: DragPosition) {
  return d3.behavior
    .drag()
    .on('dragstart', () => pushUndo(annotation))
    .on('drag', function () {
      // @ts-ignore
      const dx = d3.event.dx
      switch (position) {
        case DragPosition.start:
        case DragPosition.end:
          annotation[position] = addConst(annotation[position]!, from(positionToTime(to(dx))))
          break
        case DragPosition.both:
          annotation.startTime = addConst(annotation.startTime!, from(positionToTime(to(dx))))
          annotation.endTime = addConst(annotation.endTime!, from(positionToTime(to(dx))))
          break
      }
      updateWord(annotation)
    })
    .on('dragend', function (_d, _i) {
      selectWord(annotation)
      $('#play-selection').click()
    })
}

function loadSound(url: string, kind: BufferType, fn: any) {
  var request = new XMLHttpRequest()
  request.open('GET', url, true)
  request.responseType = 'arraybuffer'
  request.onload = () => {
    context.decodeAudioData(
      request.response,
      function (audioBuffer) {
        buffers[kind] = audioBuffer
        setup(buffers[kind]!)
        if (fn) {
          fn()
        }
      },
      onError
    )
  }
  request.send()
}

function clear() {
  $('#loading').addClass('invisible')
}

function setup(buffer: AudioBuffer) {
  sourceNode = context.createBufferSource()
  sourceNode.connect(javascriptNode)
  sourceNode.buffer = buffer
  startTime = to<TimeInBuffer>(context.currentTime)
  sourceNode.onended = () => {
    audioIsPlaying -= 1
    redraw()
  }
  if (!mute) sourceNode.connect(context.destination)
  // Maybe?
  // sourceNode.playbackRate.value = 0.5
  // sourceNode.loop = true
}

function play(offset_: TimeInBuffer, duration_?: TimeInBuffer) {
  const offset = from(offset_)
  startTime = to<TimeInBuffer>(context.currentTime)
  startOffset = offset_
  if (duration_ != null) {
    const duration = from(duration_)
    endTime = offset + duration
    audioIsPlaying += 1
    sourceNode.start(0, offset, duration)
  } else {
    endTime = 1000000 // infinity seconds..
    audioIsPlaying += 1
    sourceNode.start(0, offset)
  }
}

function stopPlaying() {
  // Might need to do: player.sourceNode.noteOff(0) on some browsers?
  try {
    sourceNode.stop(0)
    startOffset = to(context.currentTime - from(add(startTime, startOffset)))
    redraw()
  } catch (err) {
    // Calling stop more than once should be safe, although
    // catching all errors is bad form
  }
}

function onError(e: any) {
  console.log(e)
}

function timeInMovieToPercent(time: TimeInMovie): string {
  return 100 * ((from(time) - startS) / (endS - startS)) + '%'
}
function timeInMovieToTimeInBuffer(time: TimeInMovie): TimeInBuffer {
  return positionToTimeInBuffer(absoluteTimeToPosition(time))
}
function absoluteTimeToPosition(time: TimeInMovie): PositionInSpectrogram {
  return to(((from(time) - startS) / (endS - startS)) * canvas.width)
}
function timeToPosition(time: TimeInSegment): PositionInSpectrogram {
  return to((from(time) / (endS - startS)) * canvas.width)
}
function timeInBufferToPosition(time: TimeInBuffer): PositionInSpectrogram {
  return to((from(time) / sourceNode.buffer!.duration) * canvas.width)
}
function timeInMovieToPosition(time: TimeInMovie): PositionInSpectrogram {
  return to(((from(time) - startS) / (endS - startS)) * canvas.width)
}
function positionToTime(position: PositionInSpectrogram): TimeInSegment {
  return to((from(position) * (endS - startS)) / canvas.width)
}
function positionToTimeInBuffer(position: PositionInSpectrogram): TimeInBuffer {
  return to((from(position) * sourceNode.buffer!.duration) / canvas.width)
}
function positionToAbsoluteTime(position: PositionInSpectrogram): TimeInMovie {
  return to(startS + (from(position) * (endS - startS)) / canvas.width)
}

function redraw(timeOffset?: TimeInBuffer) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (timeOffset != null && from<TimeInBuffer>(timeOffset) < endTime) {
    var offset = timeInBufferToPosition(timeOffset)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillRect(from<PositionInSpectrogram>(offset), 1, 1, canvas.height)
  }
  if (lastClick != null) {
    ctx.fillStyle = 'rgba(200, 0, 0, 0.9)'
    ctx.fillRect(from<PositionInSpectrogram>(timeInMovieToPosition(lastClick)), 1, 2, canvas.height)
  }
  if (dragStart != null) {
    ctx.fillStyle = 'rgba(200, 0, 0, 0.9)'
    ctx.fillRect(from<PositionInSpectrogram>(timeInMovieToPosition(dragStart)), 1, 2, canvas.height)
  }
}

function mousePosition() {
  // @ts-ignore
  const x = d3.event.layerX
  // @ts-ignore
  const y = d3.event.layerY
  return {
    x: x,
    y: y,
  }
}

function updateWords(words: string[]) {
  $('#words').empty()
  annotations = []
  _.forEach(words, function (word, index) {
    annotations[index] = { index: index, word: word }
    $('#words')
      .append($('<a href="#">').append($('<span class="word label label-danger">').text(word).data('index', index)))
      .append(' ')
  })
  $('.word').click(function (e) {
    clear()
    e.preventDefault()
    var annotation = annotations[$(this).data('index')]
    if (annotation.startTime != null) {
      if (annotation.endTime != null) {
        selectWord(annotation)
        $('#play-selection').click()
      } else {
        if (lastClick != null) {
          selectWord(endWord(annotation, lastClick))
          $('#play-selection').click()
        } else {
          message('danger', 'Place the marker first by clicking on the image')
        }
      }
    } else {
      if (lastClick != null) {
        selectWord(startWord($(this).data('index'), lastClick))
        $('#play-selection').click()
      } else if (selected != null && annotations[selected].endTime != null) {
        selectWord(startWord($(this).data('index'), addConst(annotations[selected].endTime!, 0.1)))
        $('#play-selection').click()
      } else message('danger', 'Place the marker first by clicking on the image')
    }
  })
}

function levenshteinAlignment(
  iWords: string[],
  i: number,
  jWords: string[],
  j: number,
  cache: (number | boolean)[][]
): any {
  if (cache[i][j] !== false) {
    return cache[i][j]
  }
  let out
  if (i >= iWords.length) {
    out = { distance: Math.abs(jWords.length - j) }
  } else if (j >= jWords.length) {
    out = { distance: Math.abs(iWords.length - i) }
  } else {
    let ret1 = _.clone(levenshteinAlignment(iWords, i + 1, jWords, j, cache))
    ret1.distance += 0.1
    let ret2 = _.clone(levenshteinAlignment(iWords, i, jWords, j + 1, cache))
    ret2.distance += 0.1
    let ret3 = _.clone(levenshteinAlignment(iWords, i + 1, jWords, j + 1, cache))
    if (iWords[i] === jWords[j]) ret3[i] = j
    else ret3.distance += 1
    if (ret1.distance < ret2.distance && ret1.distance < ret3.distance) {
      out = ret1
    } else if (ret2.distance < ret1.distance && ret2.distance < ret3.distance) {
      out = ret2
    } else {
      out = ret3
    }
  }
  cache[i][j] = out
  return out
}

function alignWords(newWords: string[], oldWords: string[]): any {
  let cache: (number | boolean)[][] = []
  _.forEach(_.range(0, newWords.length + 2), i => {
    cache[i] = []
    _.forEach(_.range(0, oldWords.length + 2), j => {
      cache[i][j] = false
    })
  })
  return levenshteinAlignment(newWords, 0, oldWords, 0, cache)
}

// This clones without the UI elements
function cloneAnnotation(a: Annotation): Annotation {
  return {
    startTime: a.startTime,
    endTime: a.endTime,
    lastClickTimestamp: a.lastClickTimestamp,
    word: a.word,
    index: a.index,
  }
}

function updateWordsWithAnnotations(newWords: string[]) {
  $('#words').empty()
  const oldWords = words
  const oldAnnotations = _.cloneDeep(annotations)
  _.forEach(annotations, removeAnnotation)
  const alignment = alignWords(newWords, oldWords)
  words = newWords
  annotations = []
  _.forEach(words, function (word, index) {
    annotations[index] = { word: word, index: index }
    if (_.has(alignment, index)) {
      const old = oldAnnotations[alignment[index]]
      annotations[index].startTime = old.startTime
      annotations[index].endTime = old.endTime
      annotations[index].lastClickTimestamp = old.lastClickTimestamp
    } else if (oldWords.length == newWords.length) {
      // If there is no alignment but the number of words is unchanged, then
      // we replaced one or more words. We preserve the annotations in that
      // case.
      const old = oldAnnotations[index]
      annotations[index].startTime = old.startTime
      annotations[index].endTime = old.endTime
      annotations[index].lastClickTimestamp = old.lastClickTimestamp
    }
  })
  _.forEach(words, function (word, index) {
    $('#words')
      .append($('<a href="#">').append($('<span class="word label label-danger">').text(word).data('index', index)))
      .append(' ')
  })
  $('.word').click(function (e) {
    clear()
    e.preventDefault()
    var annotation = annotations[$(this).data('index')]
    if (annotation.startTime != null) {
      if (annotation.endTime != null) {
        selectWord(annotation)
        $('#play-selection').click()
      } else {
        if (lastClick != null) {
          selectWord(endWord(annotation, lastClick))
          $('#play-selection').click()
        } else {
          message('danger', 'Place the marker first by clicking on the image')
        }
      }
    } else {
      if (lastClick != null) {
        selectWord(startWord($(this).data('index'), lastClick))
        $('#play-selection').click()
      } else if (selected != null && annotations[selected].endTime != null) {
        selectWord(startWord($(this).data('index'), addConst(annotations[selected].endTime!, 2)))
        $('#play-selection').click()
      } else message('danger', 'Place the marker first by clicking on the image')
    }
  })
  _.forEach(annotations, updateWord)
}

function startWord(index: number, time: TimeInMovie) {
  if (
    !_.find(annotations, function (key) {
      return key.index != index && key.startTime == time
    })
  ) {
    clear()
    deleteWord(annotations[index])
    selected = null
    annotations[index] = {
      index: index,
      word: words[index],
      startTime: time,
      // TODO Constant
      endTime: lift(time, p => Math.min(p + words[index].length * 0.05, endS)),
    }
    updateWord(annotations[index])
    return annotations[index]
  } else {
    message('danger', "Words can't start at the same position")
    throw "Words can't start at the same position"
  }
}

function closestWord(time: TimeInMovie) {
  return _.sortBy(
    _.filter(annotations, function (annotation: Annotation) {
      return annotation.startTime != null && annotation.startTime < time
    }),
    function (annotation: Annotation, _index: number) {
      return sub(time, annotation.startTime!)
    }
  )[0]
}

function endWord(word: Annotation, time: TimeInMovie) {
  if (!word) {
    message('danger', 'No word to end')
    throw 'No word to end'
  }
  if (word.endTime != null) {
    message('danger', 'Words already ended')
    throw 'Words already ended'
  }
  if (word.startTime == null) {
    message('danger', 'Word has not been started')
    throw 'Word has not been started'
  }
  // TODO Constant
  if (Math.abs(from<TimeInMovie>(sub(time, word.startTime!))) < 0.01) {
    throw message('danger', "The start and end of a word can't overlap")
  }
  word.endTime = time
  if (word.endTime < word.startTime) {
    var end = word.endTime
    var start = word.startTime
    word.startTime = end
    word.endTime = start
  }
  updateWord(word)
  return word
}

function annotationColor(annotation: Annotation, isReference: boolean) {
  if (isReference) return '#5bc0de'
  if (annotation.endTime != null) {
    if (annotation.index == selected) return 'orange'
    else return '#6fe200'
  } else {
    return 'red'
  }
}

function clearWordLabels(annotation: Annotation) {
  $('.word')
    .eq(annotation.index)
    .removeClass('label-success')
    .removeClass('label-warning')
    .removeClass('label-info')
    .removeClass('label-primary')
    .removeClass('label-danger')
}

function handleClickOnAnnotatedWord(annotation: Annotation, isReference: boolean) {
  return () => {
    // @ts-ignore
    d3.event.stopPropagation()
    if (!isReference) {
      clear()
      selectWord(annotation)
    }
    lastClick = positionToAbsoluteTime(to<PositionInSpectrogram>(mousePosition().x))
    if (isReference) playAnnotation(annotation)
    else $('#play-selection').click()
  }
}

function handleDragOnAnnotatedWord(annotation: Annotation, isReference: boolean, position: DragPosition) {
  if (!isReference) return drag(annotation, position)
  else return () => null
}

function updateWordBySource(annotation: Annotation, isReference: boolean, worker: string) {
  if (annotation.visuals == null)
    // @ts-ignore
    annotation.visuals = {}
  // NB This check is redudant but it makes typescript understand that annotation.visuals != null
  if (annotation.visuals != null) {
    if (annotation.startTime != null) {
      if (!isReference) {
        clearWordLabels(annotation)
        if (annotation.endTime == null) $('.word').eq(annotation.index).addClass('label-danger')
        else if (annotation.index == selected) $('.word').eq(annotation.index).addClass('label-warning')
        else $('.word').eq(annotation.index).addClass('label-success')
      }
      if (!annotation.visuals.group) {
        annotation.visuals.group = (isReference ? svgReferenceAnnotations : svgAnnotations).append('g')
        annotation.id = isReference ? worker + ':' + annotation.startTime : from<TimeInMovie>(annotation.startTime)
        annotation.visuals.group.datum(isReference ? worker + ':' + annotation.startTime : annotation.index)
      }
      if (!annotation.visuals.text)
        annotation.visuals.text = annotation.visuals.group.append('text').text(annotation.word)
      annotation.visuals.text
        .attr('filter', 'url(#blackOutlineEffect)')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '15px')
        .attr('class', 'unselectable')
        .attr('fill', annotationColor(annotation, isReference))
        .on('click', handleClickOnAnnotatedWord(annotation, isReference))
      if (!annotation.visuals.startLine) {
        annotation.visuals.startLine = annotation.visuals.group.append('line')
        annotation.visuals.startLineHandle = annotation.visuals.group
          .append('line')
          .call(
            // @ts-ignore
            handleDragOnAnnotatedWord(annotation, isReference, DragPosition.start)
          )
          .on('click', handleClickOnAnnotatedWord(annotation, isReference))
      }
      annotation.visuals.startLine
        .attr('x1', timeInMovieToPercent(annotation.startTime!))
        .attr('x2', timeInMovieToPercent(annotation.startTime!))
        .attr('y1', heightBottom(isReference))
        .attr('y2', heightTop(isReference))
        .attr('stroke', annotationColor(annotation, isReference))
        .attr('opacity', 0.7)
        .attr('stroke-width', '2')
      annotation.visuals.startLineHandle
        .attr('x1', timeInMovieToPercent(subConst(annotation.startTime!, handleOffset)))
        .attr('x2', timeInMovieToPercent(subConst(annotation.startTime!, handleOffset)))
        .attr('y1', heightBottom(isReference))
        .attr('y2', heightTop(isReference))
        .attr('stroke', annotationColor(annotation, isReference))
        .attr('opacity', 0)
        .attr('stroke-width', '12')
        .attr('name', 'startLine')
      if (annotation.endTime != null) {
        if (!annotation.visuals.filler) {
          annotation.visuals.filler = annotation.visuals.group
            .insert('rect', ':first-child')
            .call(
              // @ts-ignore
              handleDragOnAnnotatedWord(annotation, isReference, DragPosition.both)
            )
            .on('click', handleClickOnAnnotatedWord(annotation, isReference))
        }
        annotation.visuals.filler
          .attr('x', timeInMovieToPercent(annotation.startTime!))
          .attr('y', heightBottom(isReference))
          .attr('width', timeInMovieToPercent(addConst(sub(annotation.endTime!, annotation.startTime!), startS)))
          .attr('height', heightTop(isReference))
          .attr('opacity', isReference ? 0 : 0.1)
          .attr('stroke', annotationColor(annotation, isReference))
          .attr('fill', annotationColor(annotation, isReference))
        if (!annotation.visuals.endLine) {
          annotation.visuals.endLine = annotation.visuals.group.append('line')
          annotation.visuals.endLineHandle = annotation.visuals.group
            .append('line')
            .call(
              // @ts-ignore
              handleDragOnAnnotatedWord(annotation, isReference, DragPosition.end)
            )
            .on('click', handleClickOnAnnotatedWord(annotation, isReference))
        }
        annotation.visuals.endLine
          .attr('x1', timeInMovieToPercent(annotation.endTime!))
          .attr('x2', timeInMovieToPercent(annotation.endTime!))
          .attr('y1', heightBottom(isReference))
          .attr('y2', heightTop(isReference))
          .attr('stroke', annotationColor(annotation, isReference))
          .attr('opacity', 1)
          .attr('stroke-width', '2')
        annotation.visuals.endLineHandle
          .attr('x1', timeInMovieToPercent(addConst(annotation.endTime!, handleOffset)))
          .attr('x2', timeInMovieToPercent(addConst(annotation.endTime!, handleOffset)))
          .attr('y1', heightBottom(isReference))
          .attr('y2', heightTop(isReference))
          .attr('stroke', annotationColor(annotation, isReference))
          .attr('opacity', 0)
          .attr('stroke-width', '12')
        // .attr('name', 'endLine')
        if (!annotation.visuals.topLine) annotation.visuals.topLine = annotation.visuals.group.append('line')
        annotation.visuals.topLine
          .attr('x1', timeInMovieToPercent(annotation.startTime!))
          .attr('x2', timeInMovieToPercent(annotation.endTime!))
          .attr('y1', heightTopLine(isReference))
          .attr('y2', heightTopLine(isReference))
          .attr('stroke', annotationColor(annotation, isReference))
          .attr('opacity', 0.7)
          .style('stroke-dasharray', '3, 3')
          .attr('stroke-width', '2')
        annotation.visuals.text
          .attr(
            'x',
            timeInMovieToPercent(
              to(from(sub(annotation.endTime!, annotation.startTime!)) / 2 + from(annotation.startTime!))
            )
          )
          .attr('y', heightText(isReference))
          .attr('text-anchor', 'middle')
      } else {
        annotation.visuals.text.attr('x', timeInMovieToPercent(addConst(annotation.startTime!, 0.1))).attr('y', '55%')
      }
    } else {
      $('.word').eq(annotation.index).addClass('label-danger')
    }
  }
}

function updateWord(annotation: Annotation) {
  updateWordBySource(annotation, false, parameters.worker)
}

function removeAnnotation(annotation: Annotation) {
  if (annotation.visuals) {
    if (annotation.visuals.startLine) {
      annotation.visuals.startLine.remove()
      annotation.visuals.startLineHandle.remove()
    }
    if (annotation.visuals.endLine) {
      annotation.visuals.endLine.remove()
      annotation.visuals.endLineHandle.remove()
    }
    if (annotation.visuals.filler) {
      annotation.visuals.filler.remove()
    }
    if (annotation.visuals.topLine) {
      annotation.visuals.topLine.remove()
    }
    if (annotation.visuals.text) {
      annotation.visuals.text.remove()
    }
    if (annotation.visuals.group) {
      annotation.visuals.group.remove()
    }
    delete annotation.visuals
  }
  return annotation
}

function deleteWord(annotation: Annotation) {
  if (selected != null) {
    if (annotation.startTime != null) delete annotation.startTime
    if (annotation.endTime != null) delete annotation.endTime
    if (annotation.index != null) {
      clearWordLabels(annotation)
      updateWord(annotation)
    }
    removeAnnotation(annotation)
    clearSelection()
  } else message('danger', 'Click a word to select it first')
}

function fillAnnotationPositions(annotation: Annotation) {
  if (!annotation.lastClickTimestamp) annotation.lastClickTimestamp = -1
  return annotation
}

function updateBackgroundWord(worker: string, annotation: Annotation) {
  updateWordBySource(annotation, true, worker)
}

function clearSelection() {
  selected = null
  _.forEach(annotations, updateWord)
}

function find_annotation(id: string | number) {
  if (typeof id === 'number') {
    // return _.find(annotations, a => a.id == id); // TODO Switch to this
    return annotations[id]
  }
  if (typeof id === 'string') {
    return _.find(other_annotations_by_worker[id.split(':')[0]], a => a.id == id)
  }
}

function shuffleSelection() {
  // TODO This function is terrible
  let workerAnnotations = svgAnnotations.selectAll('g').sort(function (a, b) {
    // TODO Selection
    return d3.ascending(
      // @ts-ignore
      find_annotation(a).lastClickTimestamp,
      // @ts-ignore
      find_annotation(b).lastClickTimestamp
    )
  })[0][0]
  if (!_.isUndefined(workerAnnotations)) {
    return workerAnnotations
  }
  return svgReferenceAnnotations.selectAll('g').sort(function (a, b) {
    // TODO Selection
    return d3.ascending(
      // @ts-ignore
      find_annotation(a).lastClickTimestamp,
      // @ts-ignore
      find_annotation(b).lastClickTimestamp
    )
    // @ts-ignore
  })[0][0].__data__
}

function selectWord(annotation: Annotation) {
  if (annotation != null) {
    lastClick = null
    selected = annotation.index
    annotation.lastClickTimestamp = Date.now()
    _.forEach(annotations, updateWord)
    shuffleSelection()
  }
}

function nextWord() {
  var word = _.filter(annotations, function (annotation: Annotation) {
    return annotation.startTime == null
  })[0]
  if (word) return word.index
  else return null
}

function nextAnnotation(index: number) {
  var word = _.filter(annotations, function (annotation: Annotation) {
    return annotation.index > index && annotation.startTime != null
  })[0]
  if (word) return word.index
  else return null
}

function previousAnnotation(index: number): number | null {
  var word = _.last(
    _.filter(annotations, function (annotation: Annotation) {
      return annotation.index < index && annotation.startTime != null
    })
  )
  if (word) return word.index
  else return null
}

$('#play').click(function (_e) {
  clear()
  stopPlaying()
  setup(buffers[bufferKind]!)
  play(to(0))
})
$('#play-transcript').click(function (_e) {
  $('#play').click()
})
$('#stop').click(function (_e) {
  clear()
  stopPlaying()
  redraw(startOffset)
})
$('#delete-selection').click(function (_e) {
  clear()
  if (selected != null) {
    var index = annotations[selected].index
    deleteWord(annotations[selected])
    const previous = previousAnnotation(index)
    const next = nextAnnotation(index)
    if (previous != null) selectWord(annotations[previous])
    else if (next != null) selectWord(annotations[next])
    else message('danger', 'Click a word to select it first')
  } else message('danger', 'Click a word to select it first')
})

function playAnnotation(annotation: Annotation) {
  stopPlaying()
  setup(buffers[bufferKind]!)
  if (annotation.endTime != null)
    play(
      timeInMovieToTimeInBuffer(annotation.startTime!),
      sub(timeInMovieToTimeInBuffer(annotation.endTime), timeInMovieToTimeInBuffer(annotation.startTime!))
    )
  else play(timeInMovieToTimeInBuffer(annotation.startTime!), defaultPlayLength())
}

$('#play-selection').click(function (_e) {
  clear()
  if (selected != null) {
    stopPlaying()
    setup(buffers[bufferKind]!)
    playAnnotation(annotations[selected])
  } else message('danger', 'Click a word to select it first')
})

$('#start-next-word').click(function (_e) {
  clear()
  if (lastClick != null) {
    const firstMissingWord = _.head(_.filter(annotations, a => !isValidAnnotation(a)))
    if (!firstMissingWord) {
      message('danger', "All words are already annotated; can't start another one")
      throw "All words are already annotated; can't start another one"
    } else {
      startWord(firstMissingWord.index, lastClick)
      selectWord(firstMissingWord)
    }
  } else {
    message('danger', 'Place the marker first by clicking on the image')
    throw 'Place the marker first by clicking on the image'
  }
})

$('#start-next-word-after-previous').click(function (_e) {
  clear()
  if (
    selected != null &&
    annotations[selected].endTime != null &&
    (annotations[selected + 1] == null || annotations[selected + 1].endTime == null)
  ) {
    if (selected + 1 >= words.length) {
      message('danger', 'No next word to annotate')
      return
    }
    selectWord(startWord(selected + 1, annotations[selected].endTime!))
    $('#play-selection').click()
  } else {
    message('danger', 'Select a word to add one after it')
    return
  }
})

$('#end-word').click(function (_e) {
  clear()
  var position = null
  if (lastClick != null) {
    position = lastClick
  }
  if (position != null) {
    var word = endWord(closestWord(position), position)
    if (word) {
      selectWord(word)
      $('#play-selection').click()
    } else {
      message('danger', 'No word to end')
    }
  } else message('danger', 'Place the marker first by clicking on the image')
})

$('#reset').click(function (_e) {
  clear()
  location.reload()
})

function submit(next: any) {
  clear()
  message('warning', 'Submitting annotation')
  // TODO We should reenable this for mturk
  // tokenMode()
  $.ajax({
    type: 'POST',
    data: JSON.stringify({
      segment: segment,
      token: token,
      browser: browser,
      width: canvas.width,
      height: canvas.height,
      words: words,
      selected: selected,
      start: segment.split(':')[1],
      end: segment.split(':')[2],
      startTime: startTime,
      startOffset: startOffset,
      lastClick: lastClick,
      worker: parameters.worker,
      annotations: _.map(
        _.filter(annotations, a => !_.isUndefined(a.startTime)),
        function (a) {
          return {
            startTime: a.startTime!,
            endTime: a.endTime!,
            index: a.index,
            word: a.word,
          }
        }
      ),
    }),
    contentType: 'application/json',
    url: '/submission',
    success: function (data) {
      console.log(data)
      if (data && data.response == 'ok') {
        if (data.stoken != null && token != null) {
          next()
          message('success', 'Thanks!<br/>Enter the following two characters back into Amazon Turk: ' + data.stoken)
        } else {
          next()
          message('success', 'Submitted annotation')
        }
      } else {
        message(
          'danger',
          'Failed to submit annotation!<br>Bad server reply!<br/>Please email <a href="mailto:abarbu@csail.mit.edu">abarbu@csail.mit.edu</a> with this message. Your work will not be lost and we will give you credit for it.<br/>' +
            JSON.stringify([data, annotations])
        )
      }
    },
    error: function (data, status, error) {
      message(
        'danger',
        'Failed to submit annotation!<br>Ajax error communicating with the server!<br/>Please email <a href="mailto:abarbu@csail.mit.edu">abarbu@csail.mit.edu</a> with this message. Your work will not be lost and we will give you credit for it.<br/>' +
          JSON.stringify([data, status, error, annotations])
      )
    },
  })
}

$('#submit').click(_e => submit((a: any) => a))

$('input[type="checkbox"],[type="radio"]').not('#create-switch').bootstrapSwitch()
$('#toggle-audio').on('switchChange.bootstrapSwitch', () => {
  stopPlaying()
  mute = !mute
})
$('#toggle-speed').on('switchChange.bootstrapSwitch', () => {
  stopPlaying()
  if (bufferKind == BufferType.half) bufferKind = BufferType.normal
  else if (bufferKind == BufferType.normal) bufferKind = BufferType.half
})

$('#edit-transcript').click(function (_e) {
  if (!editingTranscriptMode) {
    $('#transcript-entry').removeClass('display-none')
    $('#transcript-entry').addClass('display-inline')
    $('#words').addClass('display-none')
    $('#words').removeClass('display-inline')
    $('#transcript-input').val(_.join(words, ' '))
    $('#edit-transcript').text('Finish editing')
    $('#edit-transcript').removeClass('btn-primary')
    $('#edit-transcript').addClass('btn-danger')
  } else {
    $('#transcript-entry').addClass('display-none')
    $('#transcript-entry').removeClass('display-inline')
    $('#words').removeClass('display-none')
    $('#words').addClass('display-inline')
    $('#edit-transcript').text('Edit transcript')
    $('#edit-transcript').removeClass('btn-danger')
    $('#edit-transcript').addClass('btn-primary')
    updateWordsWithAnnotations(_.filter(_.split(String($('#transcript-input').val()), ' '), a => a !== ''))
  }
  editingTranscriptMode = !editingTranscriptMode
})

$('#transcript-input').keypress(function (event) {
  if (event.which == 13) {
    event.preventDefault()
    $('#edit-transcript').click()
  }
})

$('#location-input').keypress(function (event) {
  if (event.which == 13) {
    event.preventDefault()
    $('#go-to-location').click()
  }
})

$('#go-to-location').click(function (_e) {
  const val = String($('#location-input').val())
  const n = parseInt(val)
  if ('' + n !== $('#location-input').val()) {
    message('danger', "Go to location isn't an integer")
  } else {
    const s = mkSegmentName(movieName, parseInt(val), parseInt(val) + (endS - startS))
    $.get('/spectrograms/' + movieName + '/' + s + '.jpg', () => {
      reload(mkSegmentName(movieName, parseInt(val), parseInt(val) + (endS - startS)))
    }).fail(() => {
      message('danger', "That goto location doesn't exist in this movie")
    })
  }
})

$('#go-to-last').click(function (_e) {
  $.get(
    '/last-annotation',
    {
      movieName: movieName,
      startS: startS,
      endS: endS,
      worker: parameters.worker,
    },
    a => {
      if (a) {
        const start = 2 * _.floor(_.floor(a.startTime) / 2)
        reload(mkSegmentName(movieName, start, start + (endS - startS)))
      } else {
        message('danger', "You don't have any annotations, can't go to the last one")
      }
    }
  )
})

$('#replace-with-reference-annotation').click(function (_e) {
  stopPlaying()
  let reference_annotations = other_annotations_by_worker[current_reference_annotation]
  if (reference_annotations) {
    clear()
    _.map(annotations, function (a) {
      if (a) {
        selectWord(a)
        deleteWord(a)
      }
    })
    words = _.map(reference_annotations, a => a.word)
    updateWords(_.map(reference_annotations, a => a.word))
    annotations = _.map(reference_annotations, (a, k) => {
      let r = removeAnnotation(_.clone(a))
      r.index = k
      return r
    })
    _.map(annotations, function (a) {
      if (a) {
        updateWord(a)
      }
    })
    current_reference_annotation = undefined
    $('.annotation').each((_i, a) => {
      if ($(a).text() == 'none') {
        $(a).removeClass('btn-default').addClass('btn-info')
      } else {
        $(a).removeClass('btn-info').addClass('btn-default')
      }
    })
    message('success', 'Loaded the reference annotation')
  } else {
    message('warning', 'No reference annotation exists')
  }
})

$('#fill-with-reference').click(_e => {
  stopPlaying()
  const referenceAnnotations = other_annotations_by_worker[current_reference_annotation]
  if (referenceAnnotations) {
    clear()
    let existingAnnotations = _.map(annotations, cloneAnnotation)
    _.forEach(annotations, a => {
      if (a) {
        selectWord(a)
        deleteWord(a)
      }
    })
    existingAnnotations = _.filter(existingAnnotations, isValidAnnotation)
    const lastAnnotationEndTime: TimeInMovie = to(
      _.max(
        _.concat(
          -1,
          _.map(existingAnnotations, a => from<TimeInMovie>(a.endTime!))
        )
      )!
    )
    let mergedAnnotations = _.concat(
      existingAnnotations,
      // @ts-ignore
      _.filter(referenceAnnotations, (a: Annotation) => a.startTime > lastAnnotationEndTime)
    )
    words = _.map(mergedAnnotations, a => a.word)
    updateWords(_.map(mergedAnnotations, a => a.word))
    mergedAnnotations = _.map(mergedAnnotations, (a, k: number) => {
      let r = cloneAnnotation(a)
      r.index = k
      return r
    })
    annotations = mergedAnnotations
    _.map(mergedAnnotations, a => {
      if (a) {
        updateWord(a)
      }
    })
    message('success', 'Filled with the reference annotation')
  } else {
    message('warning', 'No reference annotation exists')
  }
})

function mkSegmentName(movieName: string, start: number, end: number) {
  return movieName + ':' + ('' + start).padStart(5, '0') + ':' + ('' + end).padStart(5, '0')
}

$('#back-save-4-sec').click(function (_e) {
  submit(() =>
    reload(movieName + ':' + ('' + (startS - 4)).padStart(5, '0') + ':' + ('' + (endS - 4)).padStart(5, '0'))
  )
})

$('#back-save-2-sec').click(function () {
  submit(() =>
    reload(movieName + ':' + ('' + (startS - 2)).padStart(5, '0') + ':' + ('' + (endS - 2)).padStart(5, '0'))
  )
})

$('#forward-save-2-sec').click(function () {
  submit(() =>
    reload(movieName + ':' + ('' + (startS + 2)).padStart(5, '0') + ':' + ('' + (endS + 2)).padStart(5, '0'))
  )
})

$('#forward-save-4-sec').click(function () {
  submit(() =>
    reload(movieName + ':' + ('' + (startS + 4)).padStart(5, '0') + ':' + ('' + (endS + 4)).padStart(5, '0'))
  )
})

javascriptNode!.onaudioprocess = function (_audioProcessingEvent) {
  if (sourceNode && audioIsPlaying) {
    if (from<TimeInBuffer>(startTime) == -1) startTime = to(context.currentTime)
    redraw(to<TimeInBuffer>(context.currentTime - from<TimeInBuffer>(startTime) + from<TimeInBuffer>(startOffset)))
  }
}

function render_other_annotations(worker: string) {
  current_reference_annotation = worker
  let reference_annotations = other_annotations_by_worker[worker]
  if (reference_annotations) {
    _.forEach(other_annotations_by_worker, as => _.forEach(as, removeAnnotation))
    $('.annotation').each((_i, a) => {
      if ($(a).text() == worker && reference_annotations.length > 0) {
        $(a).removeClass('btn-default').addClass('btn-info')
      } else {
        $(a).removeClass('btn-info').addClass('btn-default')
      }
    })
    _.map(reference_annotations, a => updateBackgroundWord(worker, a))
    message('success', 'Showing the reference annotation')
  } else {
    message('warning', 'Cannot show reference annotation')
  }
}

function register_other_annotations(worker: string) {
  let reference_annotations = other_annotations_by_worker[worker]
  if (reference_annotations && worker != parameters.worker) {
    $('#annotations')
      .append(
        $('<button type="button" class="annotation btn btn-default">')
          .text(worker)
          .data('worker', worker)
          .click(() => render_other_annotations(worker))
          .prop('disabled', reference_annotations.length == 0)
      )
      .append(' ')
    message('success', 'Loaded the reference annotation')
  } else {
    message('warning', 'No reference annotation exists')
  }
}

function preloadNextSegment(segment: string) {
  if (preloadSegments) {
    try {
      let s = parseSegment(segment)
      s.startTime += 2
      s.endTime += 2
      $.ajax({
        url: '/audio-clips/' + s.movieName + '/' + segmentString(s) + '.mp3',
        method: 'GET',
        dataType: 'arraybuffer',
      }),
        $.ajax({
          url: '/audio-clips/' + s.movieName + '/' + segmentString(s) + '-0.5.mp3',
          method: 'GET',
          dataType: 'arraybuffer',
        }),
        $.get('/annotations', {
          movieName: s.movieName,
          startS: s.startTime,
          endS: s.endTime,
          workers: _.concat([parameters.worker], references),
        })
      $.ajax({ url: '/spectrograms/' + movieName + '/' + segmentString(s) + '.jpg', method: 'GET' })
    } catch (err) {}
  }
}

function reload(segmentName: null | string) {
  if (loading) return
  stopPlaying()
  loading = true
  $('#words').empty()
  words = []
  $('#annotations').empty()
  $('#annotations').append(
    $('<button type="button" class="annotation btn btn-info">')
      .text('none')
      .data('worker', undefined)
      .click(() => {
        $('.annotation').each((_i, a) => {
          current_reference_annotation = undefined
          if ($(a).text() == 'none') {
            $(a).removeClass('btn-default').addClass('btn-info')
          } else {
            $(a).removeClass('btn-info').addClass('btn-default')
          }
        })
        _.forEach(other_annotations_by_worker, as => _.forEach(as, removeAnnotation))
      })
  )
  _.forEach(other_annotations_by_worker, as => {
    _.forEach(as, removeAnnotation)
  })
  _.forEach(annotations, removeAnnotation)
  annotations = []
  if (segmentName) {
    setSegment(segmentName)
    let param = $.url().param()
    param.segment = segmentName
    window.history.pushState($.url().param(), 'Audio annotation', '/gui.html?' + $.param(param))
  }

  $('#spectrogram').attr('src', '/spectrograms/' + movieName + '/' + segment + '.jpg')

  message('warning', 'Loading audio ...')

  $('#location-input').val(startS)

  $.when(
    $.ajax({ url: '/audio-clips/' + movieName + '/' + segment + '.mp3', method: 'GET', dataType: 'arraybuffer' }),
    $.ajax({ url: '/audio-clips/' + movieName + '/' + segment + '-0.5.mp3', method: 'GET', dataType: 'arraybuffer' }),
    $.get('/annotations', {
      movieName: movieName,
      startS: startS,
      endS: endS,
      workers: _.concat([parameters.worker], references),
    })
  ).done((clip_, clipHalf_, ass_) => {
    preloadNextSegment(segment)
    const clip = clip_[0]
    const clipHalf = clipHalf_[0]
    const ass = ass_[0]
    context.decodeAudioData(
      clip,
      function (audioBuffer) {
        buffers['normal'] = audioBuffer
        setup(buffers['normal'])
      },
      onError
    )
    context.decodeAudioData(
      clipHalf,
      function (audioBuffer) {
        buffers['half'] = audioBuffer
        setup(buffers['half'])
      },
      onError
    )
    _.forEach(ass, as => {
      other_annotations_by_worker[as.worker] = _.map(as.annotations, fillAnnotationPositions)
      register_other_annotations(as.worker)
    })
    function loadAnnotations(id: string) {
      if (_.isEmpty(words)) {
        words = _.map(other_annotations_by_worker[id], a => a.word)
        updateWords(words)
      }
      render_other_annotations(id)
    }
    loadAnnotations(parameters.worker)
    $('#replace-with-reference-annotation').click()
    if (_.has(other_annotations_by_worker, parameters.defaultReference)) loadAnnotations(parameters.defaultReference)
    loading = false
    message('success', 'Loaded ' + segment)
  })
}

reload(null)

// Intro.js

$('#container-wrapper')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Task')
  .attr(
    'data-bootstro-content',
    "You're going to annotate the beginning and end of each word on this diagram. It's a representation of the audio. Click anyhwere on it to play a chunk of the audio."
  )
  .attr('data-bootstro-placement', 'bottom')
  .attr('data-bootstro-width', '700px')
  .attr('data-bootstro-step', '0')

$('#play')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Play')
  .attr(
    'data-bootstro-content',
    'You can play the entire audio clip with this button. By default the audio plays at half the speed to make annotation easier.'
  )
  .attr('data-bootstro-placement', 'bottom')
  .attr('data-bootstro-step', '1')

$('#toggle-speed-div')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Audio speed')
  .attr(
    'data-bootstro-content',
    'It can be hard to catch each word and when it was said. We play the audio at half speed by default, you can change this to regular speed.'
  )
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '2')

$('#transcript-panel')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Words')
  .attr('data-bootstro-content', 'We try to guess which words might have been said.')
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '3')

$('#edit-transcript')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Transcript')
  .attr('data-bootstro-content', 'Listen to the audio and edit the words. Words may be wrong or missing.')
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '4')

$('#spectrogram')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Selecting')
  .attr(
    'data-bootstro-content',
    'Once you have the words, place the red marker on the diagram. A short audio segment will play.'
  )
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '5')

$('#words')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Words')
  .attr(
    'data-bootstro-content',
    'With the market in position you can choose which word to start at that location. We guess the word length, but you should adjust it.'
  )
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '6')

$('#container')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Adjusting')
  .attr(
    'data-bootstro-content',
    'Drag the start and ends of words. Green words are ones that you annotated. The orange word is the currenctly selected one. If any white words exist, they are references we provide to make life eaiser.'
  )
  .attr('data-bootstro-placement', 'bottom')
  .attr('data-bootstro-step', '7')

$('#d3')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Verifying')
  .attr(
    'data-bootstro-content',
    'You should adjust the word boundaries by dragging them into the correct position on the diagram. The audio will automatically play. You can replay by clicking here or by using the keyboard shortcuts in red.'
  )
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '8')

$('#delete-selection')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Deleting')
  .attr('data-bootstro-content', "If a word isn't relevant or annotated incorrectly you can remove it.")
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '9')

$('#annotations')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'References')
  .attr(
    'data-bootstro-content',
    'Sometimes we have reference annotation available. You can select any references here. This includes any previous work you have done. They appear in white on the audio. Your annotations are in green and your selected annotation is in orange. The white annotations cannot be changed.'
  )
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '10')

$('#replace-reference')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'References')
  .attr(
    'data-bootstro-content',
    'You can replace your annotation with the reference one or use the reference to fill in missing parts of your annotations.'
  )
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '11')

$('#seek')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Longer clips')
  .attr(
    'data-bootstro-content',
    'You see 4 seconds of audio each time. You can navigate forward and backward by 2 seconds or 4 seconds in the longer audio clip.'
  )
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '12')

$('#save-and-seek')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Saving while navigating')
  .attr(
    'data-bootstro-content',
    'You will usually annotate and then move on to the next segment. These buttons move you but also save your work each time.'
  )
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '13')

$('#submit-button')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Submit')
  .attr('data-bootstro-content', 'You can save your work on the current segment by submitting it.') // TODO Update for MTurk
  .attr('data-bootstro-placement', 'bottom')
  .attr('data-bootstro-step', '14')

// $('#submit').addClass('bootstro')
//     .attr('data-bootstro-title', "Submitting")
//     .attr('data-bootstro-content', "Once you're done with all of the words you can click here and we'll give you the token to enter into Amazon interface. It's ok to leave out a word if you can't recognize it, it's too noisy, or if it's not actually there. Thanks for helping us with our research!")
//     .attr('data-bootstro-placement', "bottom")
//     .attr('data-bootstro-step', '6')

$('#intro').click(() => {
  // @ts-ignore
  bootstro.start('.bootstro', {
    finishButton:
      '<button class="btn btn-mini btn-warning bootstro-finish-btn"><i class="icon-ok"></i>Exit tutorial</button>',
  })
})
