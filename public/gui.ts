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

// https://www.everythingfrontend.com/posts/newtype-in-typescript.html
type TimeInBufer = {value: number; readonly __tag: unique symbol}
type TimeInSegment = {value: number; readonly __tag: unique symbol}
type TimeInMovie = {value: number; readonly __tag: unique symbol}
type PositionInSpectrogram = {value: number; readonly __tag: unique symbol}

function add<
    T extends { readonly __tag: symbol, value: number }
    >(t1: T, t2: T): T {
        return lift2<T>(t1, t2, (a,b) => a + b);
}

function sub<
    T extends { readonly __tag: symbol, value: number }
    >(t1: T, t2: T): T {
        return lift2<T>(t1, t2, (a,b) => a - b);
}

function addConst<
    T extends { readonly __tag: symbol, value: number }
    >(t: T, c : number): T {
        return lift<T>(t, a => a + c);
}

function subConst<
    T extends { readonly __tag: symbol, value: number }
    >(t: T, c : number): T {
        return lift<T>(t, a => a - c);
}

function addMaxConst<
    T extends { readonly __tag: symbol, value: number }
    >(t1: T, t2: T, c : number): T {
        return lift2<T>(t1, t2, (a,b) => Math.max(a+b, c));
}

function subMinConst<
    T extends { readonly __tag: symbol, value: number }
    >(t1: T, t2: T, c : number): T {
        return lift2<T>(t1, t2, (a,b) => Math.min(a-b, c));
}

function to<
    T extends { readonly __tag: symbol, value: any } =
    { readonly __tag: unique symbol, value: never }
>(value: T["value"]): T {
    return value as any as T;
}

function from<
    T extends { readonly __tag: symbol, value: any }
>(value: T): T["value"] {
    return value as any as T["value"];
}

function lift<
    T extends { readonly __tag: symbol, value: any }
>(value: T, callback: (value: T["value"]) => T["value"]): T {
    return callback(value);
}

function lift2<
    T extends { readonly __tag: symbol, value: any }
>(x: T, y: T, callback: (x: T["value"], y: T["value"]) => T["value"]): T {
    return callback(x, y);
}

interface Annotation {
    word : string,
    index : number,
    start? : PositionInSpectrogram,
    end? : PositionInSpectrogram
    startTime? : number,
    endTime? : number,
    lastClickTimestamp? : number,
    id? : string | number,
    visuals? : Visuals,
}

interface Visuals {
    group : d3.Selection<SVGElement>,
    text : d3.Selection<SVGElement>,
    startLine : d3.Selection<SVGElement>,
    startLineHandle : d3.Selection<SVGElement>,
    endLine : d3.Selection<SVGElement>,
    endLineHandle : d3.Selection<SVGElement>,
    filler : d3.Selection<SVGElement>,
    topLine : d3.Selection<SVGElement>,
}

interface Buffers {
    normal : null | AudioBuffer,
    half : null | AudioBuffer
}

enum BufferType {
    normal = "normal",
    half = "half",
}

enum DragPosition {
    start = "start",
    end = "end",
}

// Some global extensions

interface JQueryStatic {
    url : any;
}
interface JQuery {
    bootstrapSwitch : any;
}
interface AudioBufferSourceNode {
    playbackState : any;
    PLAYING_STATE : any;
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
$.ajaxTransport("+*", function(options, _originalOptions, jqXHR){
    // Test for the conditions that mean we can/want to send/receive blobs or arraybuffers - we need XMLHttpRequest
    // level 2 (so feature-detect against window.FormData), feature detect against window.Blob or window.ArrayBuffer,
    // and then check to see if the dataType is blob/arraybuffer or the data itself is a Blob/ArrayBuffer
    if (FormData && ((options.dataType && (options.dataType === 'blob' || options.dataType === 'arraybuffer')) ||
        (options.data && ((window.Blob && options.data instanceof Blob) ||
            (ArrayBuffer && options.data instanceof ArrayBuffer)))
        ))
    {
        return {
            /**
             * Return a transport capable of sending and/or receiving blobs - in this case, we instantiate
             * a new XMLHttpRequest and use it to actually perform the request, and funnel the result back
             * into the jquery complete callback (such as the success function, done blocks, etc.)
             *
             * @param headers
             * @param completeCallback
             */
            send: function(headers, completeCallback){
                var xhr = new XMLHttpRequest(),
                    url = options.url || window.location.href,
                    type = options.type || 'GET',
                    dataType = options.dataType || 'text',
                    data = options.data || null,
                    async = options.async || true,
                    key;

                xhr.addEventListener('load', function(){
                    var response = <any>{}, isSuccess;

                    isSuccess = xhr.status >= 200 && xhr.status < 300 || xhr.status === 304;

                    if (isSuccess) {
                        response[dataType] = xhr.response;
                    } else {
                        // In case an error occured we assume that the response body contains
                        // text data - so let's convert the binary data to a string which we can
                        // pass to the complete callback.
                        response.text = String.fromCharCode.apply(null, new Uint8Array(xhr.response));
                    }

                    // @ts-ignore
                    completeCallback(xhr.status, xhr.statusText, response, xhr.getAllResponseHeaders());
                });

                xhr.open(type, url, async);
                // @ts-ignore
                xhr.responseType = dataType;

                for (key in headers) {
                    if (headers.hasOwnProperty(key)) xhr.setRequestHeader(key, headers[key]);
                }
                // @ts-ignore
                xhr.send(data);
            },
            abort: function(){
                jqXHR.abort();
            }
        };
    }
});

var loading = false

var viewer_width = 2240 // 1200
var viewer_height = 830 // 565
var viewer_border = 0

$('#canvas').attr('width', viewer_width).attr('height', viewer_height)
$('#d3')
  .attr('width', viewer_width)
  .attr('height', viewer_height + viewer_border)
$('#container')
  .css('width', viewer_width)
  .css('height', viewer_height + viewer_border)

const canvas = <HTMLCanvasElement> $('#canvas')[0]!
const ctx = canvas.getContext('2d')!

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

function message(kind : string, msg : string) {
  $('#loading')
    .html('<h4><div class="alert alert-' + kind + '">' + msg + '</span></h4>')
    .removeClass('invisible')
}

var parameters = $.url().param()

var segment : string
var startS : number
var endS : number
var movieName : string
var bufferKind : BufferType
// Fetched based on the segment
var words : string[] = []
var mode : string
var token : string
var browser = navigator.userAgent.toString()
var other_annotations_by_worker: { [name: string]: Annotation[] } = {} // previous_annotation
// TODO Should expose this so that we can change the default
var current_reference_annotation = parameters.defaultReference
var references = _.isUndefined(parameters.references)
  ? []
  : _.split(parameters.references, ',')

// This has a race condition between stopping and start the audio, that's why we
// have a counter. 'onended' is called after starting a new audio playback,
// because the previous playback started.
var audioIsPlaying = 0

// For the transcript pane
var editingTranscriptMode = false

function setSegment(segmentName:string) {
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
  $(document).bind('keydown', 'n', () => {
    $('#forward-2-sec').click()
  })
  $(document).bind('keydown', 'p', () => {
    $('#back-2-sec').click()
  })
  $(document).bind('keydown', 's', () => {
    $('#submit').click()
  })
  $(document).bind('keydown', 'r', () => {
    $('#fill-with-reference').click()
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
function defaultPlayLength() : TimeInBufer {
    switch(bufferKind) {
        case BufferType.half:
            return to(1)
        case BufferType.normal:
            return to(0.5)
    }
}

var buffers : Buffers = {normal: null, half: null}
var sourceNode : AudioBufferSourceNode
var javascriptNode : ScriptProcessorNode
var startTime : number = 0
var startOffset : number = 0
var lastClick : PositionInSpectrogram | null = null
var selected : number | null = null
var annotations : Annotation[]
var mute : boolean = false
var minimumOffset : PositionInSpectrogram = to<PositionInSpectrogram>(8)

var svg = d3.select('#d3')
svg
  .append('rect')
  .attr('width', $('#d3').attr('width')!)
  .attr('height', $('#d3').attr('height')!)
  .attr('fill', '#ffffff')
  .attr('fill-opacity', 0.0)
  .on('click', function (_d, _i) {
    $('#canvas').click()
  })
var svgReferenceAnnotations : d3.Selection<SVGElement> = svg.append('g')
var svgAnnotations : d3.Selection<SVGElement> = svg.append('g')

function drag(annotation : Annotation, position : DragPosition) {
  return d3.behavior
    .drag()
    .on('drag', function (_d, _i) {
      selectWord(annotation)
      // @ts-ignore
      const x = d3.event.x
      var destination
      if (position == 'start' && annotation.end != null) {
          destination = subMinConst(annotation.end, minimumOffset, x)
      } else if (position == 'end') {
          destination = addMaxConst(annotation.start!, minimumOffset, x)
      } else {
        destination = x
      }
      annotation[position] = destination
      updateWord(annotation)
    })
    .on('dragend', function (_d, _i) {
      selectWord(annotation)
      $('#play-selection').click()
    })
}

function loadSound(url : string, kind : BufferType, fn : any) {
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

function setup(buffer : AudioBuffer) {
  sourceNode = context.createBufferSource()
  sourceNode.connect(javascriptNode)
  sourceNode.buffer = buffer
  startTime = context.currentTime
  sourceNode.onended = () => {
    audioIsPlaying -= 1
    redraw()
  }
  if (!mute) sourceNode.connect(context.destination)
  // Maybe?
  // sourceNode.playbackRate.value = 0.5
  // sourceNode.loop = true
}

function play(offset_ : TimeInBufer, duration_? : TimeInBufer) {
  const offset = from(offset_)
  startTime = context.currentTime
  startOffset = offset
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
    startOffset = context.currentTime - startTime + startOffset
      redraw()
  } catch (err) {
    // Calling stop more than once should be safe, although
    // catching all errors is bad form
  }
}

function onError(e : any) {
  console.log(e)
}

function timeToPosition(time : number) : PositionInSpectrogram {
    return to((time / (endS - startS)) * canvas.width)
}
function timeInBufferToPosition(time : number) {
    return (time / sourceNode.buffer!.duration) * canvas.width
}
function positionToTime(position : PositionInSpectrogram) : TimeInSegment {
    return to((from(position) * (endS - startS)) / canvas.width)
}
function positionToTimeInBuffer(position : PositionInSpectrogram) : TimeInBufer {
    return to((from(position) * sourceNode.buffer!.duration) / canvas.width)
}
function positionToAbsoluteTime(position : PositionInSpectrogram) : TimeInMovie {
    return to((startS + (from(position) * (endS - startS)) / canvas.width))
}

function redraw(timeOffset? : number) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (timeOffset != null && timeOffset < endTime) {
    var offset = timeInBufferToPosition(timeOffset)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillRect(offset, 1, 1, canvas.height)
  }
  if (lastClick != null) {
    ctx.fillStyle = 'rgba(200, 0, 0, 0.9)'
    ctx.fillRect(from<PositionInSpectrogram>(lastClick), 1, 2, canvas.height)
  }
}

function mousePosition() {
  const rect = canvas.getBoundingClientRect()
  // @ts-ignore
  const x = d3.event.clientX
  // @ts-ignore
  const y = d3.event.clientY
  return {
    x: x - rect.left,
    y: y - rect.top,
  }
}

function updateWords(words : string[]) {
  $('#words').empty()
  annotations = []
  _.forEach(words, function (word, index) {
    annotations[index] = { index: index, word: word }
    $('#words')
      .append(
        $('<a href="#">').append(
          $('<span class="word label label-info">')
            .text(word)
            .data('index', index)
        )
      )
      .append(' ')
  })
  $('.word').click(function (e) {
    clear()
    e.preventDefault()
    var annotation = annotations[$(this).data('index')]
    if (annotation.start != null) {
      if (annotation.end != null) {
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
      } else if (selected != null && annotations[selected].end != null) {
        selectWord(startWord($(this).data('index'), addConst(annotations[selected].end!, 2)))
        $('#play-selection').click()
      } else
        message('danger', 'Place the marker first by clicking on the image')
    }
  })
}

function levenshteinAlignment(iWords : string[], i : number, jWords : string[], j : number, cache : (number | boolean)[][]) : any {
    if(cache[i][j] !== false) {
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
        }
        else if (ret2.distance < ret1.distance && ret2.distance < ret3.distance) {
            out = ret2
        } else {
            out = ret3
        }
    }
    cache[i][j] = out
    return out
}

function alignWords(newWords : string[], oldWords : string[]) : any {
    let cache : (number | boolean)[][] = []
    _.forEach(_.range(0,newWords.length+2), i => {
        cache[i] = []
        _.forEach(_.range(0,oldWords.length+2), j => { cache[i][j] = false })
    })
    return levenshteinAlignment(newWords, 0, oldWords, 0, cache)
}

// This clones without the UI elements
function cloneAnnotation(a : Annotation) {
  return {
    start: a.start,
    end: a.end,
    startTime: a.startTime,
    endTime: a.endTime,
    lastClickTimestamp: a.lastClickTimestamp,
    word: a.word,
    index: a.index,
  }
}

function updateWordsWithAnnotations(newWords : string[]) {
  $('#words').empty()
  const oldWords = words
  const oldAnnotations = _.cloneDeep(annotations)
  _.forEach(annotations, removeAnnotation)
  const alignment = alignWords(newWords, oldWords)
  words = newWords
  annotations = []
  _.forEach(words, function (word, index) {
    annotations[index] = {word: word, index: index}
    if (_.has(alignment, index)) {
      const old = oldAnnotations[alignment[index]]
      annotations[index].start = old.start
      annotations[index].end = old.end
      annotations[index].startTime = old.startTime
      annotations[index].endTime = old.endTime
      annotations[index].lastClickTimestamp = old.lastClickTimestamp
    }
  })
  _.forEach(words, function (word, index) {
    $('#words')
      .append(
        $('<a href="#">').append(
          $('<span class="word label label-info">')
            .text(word)
            .data('index', index)
        )
      )
      .append(' ')
  })
  $('.word').click(function (e) {
    clear()
    e.preventDefault()
    var annotation = annotations[$(this).data('index')]
    if (annotation.start != null) {
      if (annotation.end != null) {
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
      } else if (selected != null && annotations[selected].end != null) {
        selectWord(
          startWord($(this).data('index'), addConst(annotations[selected].end!, 2))
        )
        $('#play-selection').click()
      } else
        message('danger', 'Place the marker first by clicking on the image')
    }
  })
  _.forEach(annotations, updateWord)
}

function startWord(index : number, position : PositionInSpectrogram) {
  if (
    !_.find(annotations, function (key) {
      return key.index != index && key.start == position
    })
  ) {
    clear()
    deleteWord(annotations[index])
    selected = null
    annotations[index] = {
      index: index,
      word: words[index],
        start: position,
        // TODO Constant
        end: lift(position, p => Math.min(p + words[index].length * 10, canvas.width))
    }
    updateWord(annotations[index])
    return annotations[index]
  } else {
      message('danger', "Words can't start at the same position")
      throw "Words can't start at the same position"
  }
}

function closestWord(position : PositionInSpectrogram) {
  return _.sortBy(
    _.filter(annotations, function (annotation : Annotation) {
      return annotation.start != null && annotation.start < position
    }),
    function (annotation : Annotation, _index : number) {
        return sub(position, annotation.start!)
    }
  )[0]
}

function endWord(word : Annotation, position : PositionInSpectrogram) {
  if (!word) {
    message('danger', 'No word to end')
    throw 'No word to end'
  }
  if (word.end != null) {
    message('danger', 'Words already ended')
    throw 'Words already ended'
  }
  if (word.start == null) {
    message('danger', 'Word has not been started')
    throw 'Word has not been started'
  }
  // TODO Constant
  if (Math.abs(from<PositionInSpectrogram>(sub(position, word.start))) < 3) {
    throw message('danger', "The start and end of a word can't overlap")
  }
  word.end = position
  if (word.end < word.start) {
    var end = word.end
    var start = word.start
    word.start = end
    word.end = start
  }
  updateWord(word)
  return word
}

function annotationColor(annotation : Annotation) {
  if (annotation.end != null) {
    if (annotation.index == selected) return 'orange'
    else return 'lawngreen'
  } else {
    return 'red'
  }
}

function clearWordLabels(annotation : Annotation) {
  $('.word')
    .eq(annotation.index)
    .removeClass('label-success')
    .removeClass('label-warning')
    .removeClass('label-info')
    .removeClass('label-primary')
    .removeClass('label-danger')
}

function updateWord(annotation : Annotation) {
    if(annotation.visuals == null)
        // @ts-ignore
        annotation.visuals = {}
    // NB This check is redudant but it makes typescript understand that annotation.visuals != null
    if(annotation.visuals != null) {
        if (annotation.start != null) {
            clearWordLabels(annotation)
            if (annotation.end == null)
                $('.word').eq(annotation.index).addClass('label-danger')
            else if (annotation.index == selected)
                $('.word').eq(annotation.index).addClass('label-warning')
            else $('.word').eq(annotation.index).addClass('label-success')
            if (!annotation.visuals.group) {
                annotation.visuals.group = svgAnnotations.append('g')
                annotation.id = from<PositionInSpectrogram>(annotation.start)
                annotation.visuals.group.datum(annotation.index)
            }
            if (!annotation.visuals.text)
                annotation.visuals.text = annotation.visuals.group.append('text').text(annotation.word)
            annotation.visuals.text
                .attr('font-family', 'sans-serif')
                .attr('font-size', '15px')
                .attr('class', 'unselectable')
                .attr('fill', annotationColor(annotation))
                .on('click', () => {
                    clear()
                    selectWord(annotation)
                    lastClick = to<PositionInSpectrogram>(mousePosition().x)
                    $('#play-selection').click()
                })
            if (!annotation.visuals.startLine) {
                annotation.visuals.startLine = annotation.visuals.group.append('line')
                annotation.visuals.startLineHandle = annotation.visuals.group
                    .append('line')
                    .call(drag(annotation, DragPosition.start))
                    .on('click', () => {
                        clear()
                        selectWord(annotation)
                        lastClick = to<PositionInSpectrogram>(mousePosition().x)
                        $('#play-selection').click()
                    })
            }
            annotation.visuals.startLine
                .attr('x1', from<PositionInSpectrogram>(annotation.start))
                .attr('x2', from<PositionInSpectrogram>(annotation.start))
                .attr('y1', '0')
                .attr('y2', $('#container').height()!)
                .attr('stroke', annotationColor(annotation))
                .attr('opacity', 0.7)
                .attr('stroke-width', '2')
            annotation.visuals.startLineHandle
                .attr('x1', from<PositionInSpectrogram>(addConst(annotation.start, 3)))
                .attr('x2', from<PositionInSpectrogram>(addConst(annotation.start, 3)))
                .attr('y1', '0')
                .attr('y2', $('#container').height()!)
                .attr('stroke', annotationColor(annotation))
                .attr('opacity', 0)
                .attr('stroke-width', '10')
            if (annotation.end != null) {
                if (!annotation.visuals.filler) {
                    annotation.visuals.filler = annotation.visuals.group
                        .insert('rect', ':first-child')
                        .on('click', () => {
                            clear()
                            selectWord(annotation)
                            lastClick = to<PositionInSpectrogram>(mousePosition().x)
                            $('#play-selection').click()
                        })
                }
                annotation.visuals.filler
                    .attr('x', from<PositionInSpectrogram>(annotation.start))
                    .attr('y', 0)
                    .attr('width', from<PositionInSpectrogram>(sub(annotation.end, annotation.start)))
                    .attr('height', $('#container').height()!)
                    .attr('opacity', 0.1)
                    .attr('stroke', annotationColor(annotation))
                    .attr('fill', annotationColor(annotation))
                if (!annotation.visuals.endLine) {
                    annotation.visuals.endLine = annotation.visuals.group.append('line')
                    annotation.visuals.endLineHandle = annotation.visuals.group
                        .append('line')
                        .call(drag(annotation, DragPosition.end))
                        .on('click', () => {
                            clear()
                            selectWord(annotation)
                            lastClick = to<PositionInSpectrogram>(mousePosition().x)
                            $('#play-selection').click()
                        })
                }
                annotation.visuals.endLine
                    .attr('x1', from(annotation.end))
                    .attr('x2', from(annotation.end))
                    .attr('y1', '0')
                    .attr('y2', $('#container').height()!)
                    .attr('stroke', annotationColor(annotation))
                    .attr('opacity', 0.7)
                    .attr('stroke-width', '2')
                annotation.visuals.endLineHandle
                    .attr('x1', from(subConst(annotation.end, 3)))
                    .attr('x2', from(subConst(annotation.end, 3)))
                    .attr('y1', '0')
                    .attr('y2', $('#container').height()!)
                    .attr('stroke', annotationColor(annotation))
                    .attr('opacity', 0)
                    .attr('stroke-width', '10')
                if (!annotation.visuals.topLine)
                    annotation.visuals.topLine = annotation.visuals.group.append('line')
                annotation.visuals.topLine
                    .attr('x1', from(annotation.start))
                    .attr('x2', from(annotation.end))
                    .attr('y1', '466')
                    .attr('y2', '466')
                    .attr('stroke', annotationColor(annotation))
                    .attr('opacity', 0.7)
                    .style('stroke-dasharray', '3, 3')
                    .attr('stroke-width', '2')
                annotation.visuals.text
                    .attr('x', (from(sub(annotation.end, annotation.start))) / 2 + from(annotation.start))
                    .attr('y', '490')
                    .attr('text-anchor', 'middle')
            } else {
                annotation.visuals.text.attr('x', from(addConst(annotation.start, 4))).attr('y', '490')
            }
        } else {
            $('.word').eq(annotation.index).addClass('label-info')
        }
    }
}

function removeAnnotation(annotation : Annotation) {
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

function deleteWord(annotation : Annotation) {
  if (selected != null) {
    if (annotation.start != null) delete annotation.start
    if (annotation.end != null) delete annotation.end
    if (annotation.index != null) {
      clearWordLabels(annotation)
      updateWord(annotation)
    }
    removeAnnotation(annotation)
    clearSelection()
  } else message('danger', 'Click a word to select it first')
}

function fillAnnotationPositions(annotation : Annotation) {
  annotation.start = timeToPosition(annotation.startTime! - startS)
  annotation.end = timeToPosition(annotation.endTime! - startS)
  if (!annotation.lastClickTimestamp) annotation.lastClickTimestamp = -1
  return annotation
}

function updateBackgroundWord(worker : string, annotation : Annotation) {
    if(annotation.visuals == null)
        // @ts-ignore
        annotation.visuals = {}
    // NB This check is redudant but it makes typescript understand that annotation.visuals != null
    if(annotation.visuals != null) {
        if (annotation.start != null) {
            if (!annotation.visuals.group) {
                annotation.visuals.group = svgReferenceAnnotations.append('g')
                annotation.id = worker + ':' + annotation.start
                annotation.visuals.group.datum(worker + ':' + annotation.start)
            }
            if (!annotation.visuals.text)
                annotation.visuals.text = annotation.visuals.group.append('text').text(annotation.word)
            annotation.visuals.text
                .attr('font-family', 'sans-serif')
                .attr('font-size', '15px')
                .attr('font-weight', 'bold')
                .attr('class', 'unselectable')
                .attr('fill', 'white')
                .on('click', () => {
                    lastClick = to<PositionInSpectrogram>(mousePosition().x)
                    playAnnotation(annotation)
                })
            if (!annotation.visuals.startLine) {
                annotation.visuals.startLine = annotation.visuals.group.append('line')
                annotation.visuals.startLineHandle = annotation.visuals.group
                    .append('line')
                    .on('click', () => {
                        lastClick = to<PositionInSpectrogram>(mousePosition().x)
                        playAnnotation(annotation)
                    })
            }
            annotation.visuals.startLine
                .attr('x1', from(annotation.start))
                .attr('x2', from(annotation.start))
                .attr('y1', '0')
                .attr('y2', $('#container').height()!)
                .attr('stroke', 'white')
                .attr('opacity', 0.7)
                .attr('stroke-width', '2')
            annotation.visuals.startLineHandle
                .attr('x1', from<PositionInSpectrogram>(addConst(annotation.start, 3)))
                .attr('x2', from<PositionInSpectrogram>(addConst(annotation.start, 3)))
                .attr('y1', '0')
                .attr('y2', $('#container').height()!)
                .attr('stroke', 'white')
                .attr('opacity', 0)
                .attr('stroke-width', '10')
            if (annotation.end != null) {
                if (!annotation.visuals.filler) {
                    annotation.visuals.filler = annotation.visuals.group
                        .insert('rect', ':first-child')
                        .on('click', () => {
                            lastClick = to<PositionInSpectrogram>(mousePosition().x)
                            playAnnotation(annotation)
                        })
                }
                annotation.visuals.filler
                    .attr('x', from<PositionInSpectrogram>(annotation.start))
                    .attr('y', 0)
                    .attr('width', from<PositionInSpectrogram>(sub(annotation.end, annotation.start)))
                    .attr('height', $('#container').height()!)
                    .attr('opacity', 0.1)
                    .attr('stroke', 'white')
                    .attr('fill', 'white')
                if (!annotation.visuals.endLine) {
                    annotation.visuals.endLine = annotation.visuals.group.append('line')
                    annotation.visuals.endLineHandle = annotation.visuals.group
                        .append('line')
                        .on('click', () => {
                            lastClick = to<PositionInSpectrogram>(mousePosition().x)
                            playAnnotation(annotation)
                        })
                }
                annotation.visuals.endLine
                    .attr('x1', from<PositionInSpectrogram>(annotation.end))
                    .attr('x2', from<PositionInSpectrogram>(annotation.end))
                    .attr('y1', '0')
                    .attr('y2', $('#container').height()!)
                    .attr('stroke', 'white')
                    .attr('opacity', 0.7)
                    .attr('stroke-width', '2')
                annotation.visuals.endLineHandle
                    .attr('x1', from<PositionInSpectrogram>(subConst(annotation.end, 3)))
                    .attr('x2', from<PositionInSpectrogram>(subConst(annotation.end, 3)))
                    .attr('y1', '0')
                    .attr('y2', $('#container').height()!)
                    .attr('stroke', 'white')
                    .attr('opacity', 0)
                    .attr('stroke-width', '10')
                if (!annotation.visuals.topLine)
                    annotation.visuals.topLine = annotation.visuals.group.append('line')
                annotation.visuals.topLine
                    .attr('x1', from<PositionInSpectrogram>(annotation.start))
                    .attr('x2', from<PositionInSpectrogram>(annotation.end))
                    .attr('y1', '466')
                    .attr('y2', '466')
                    .attr('stroke', 'white')
                    .attr('opacity', 0.7)
                    .style('stroke-dasharray', '3, 3')
                    .attr('stroke-width', '2')
                annotation.visuals.text
                    .attr('x', (from(sub(annotation.end, annotation.start))) / 2 + from<PositionInSpectrogram>(annotation.start))
                    .attr('y', '490')
                    .attr('text-anchor', 'middle')
            } else {
                annotation.visuals.text.attr('x', from<PositionInSpectrogram>(annotation.start) + 4).attr('y', '490')
            }
        } else {
            $('.word').eq(annotation.index).addClass('label-info')
        }
    }
}

function clearSelection() {
  selected = null
  _.forEach(annotations, updateWord)
}

function find_annotation(id : string | number) {
  if (typeof id === 'number') {
    // return _.find(annotations, a => a.id == id); // TODO Switch to this
    return annotations[id]
  }
  if (typeof id === 'string') {
    return _.find(
      other_annotations_by_worker[id.split(':')[0]],
      (a) => a.id == id
    )
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

function selectWord(annotation : Annotation) {
  if (annotation != null) {
    lastClick = null
    selected = annotation.index
    annotation.lastClickTimestamp = Date.now()
    _.forEach(annotations, updateWord)
    shuffleSelection()
  }
}

function nextWord() {
  var word = _.filter(annotations, function (annotation : Annotation) {
    return annotation.start == null
  })[0]
  if (word) return word.index
  else return null
}

function nextAnnotation(index : number) {
  var word = _.filter(annotations, function (annotation : Annotation) {
    return annotation.index > index && annotation.start != null
  })[0]
  if (word) return word.index
  else return null
}

function previousAnnotation(index : number) : number | null {
    var word = _.last(_.filter(annotations, function (annotation : Annotation) {
    return annotation.index < index && annotation.start != null
    }))
  if (word) return word.index
  else return null
}

$('#canvas').click(function (_e) {
  clear()
  stopPlaying()
  setup(buffers[bufferKind]!)
  lastClick = to<PositionInSpectrogram>(mousePosition().x)
  play(positionToTimeInBuffer(lastClick), defaultPlayLength())
})

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
    if (previous != null)
      selectWord(annotations[previous])
      else if (next != null)
          selectWord(annotations[next])
      else message('danger', 'Click a word to select it first')
  } else message('danger', 'Click a word to select it first')
})

function playAnnotation(annotation : Annotation) {
  stopPlaying()
  setup(buffers[bufferKind]!)
  if (annotation.end != null)
    play(
      positionToTimeInBuffer(annotation.start!),
        sub(positionToTimeInBuffer(annotation.end),
            positionToTimeInBuffer(annotation.start!))
    )
  else play(positionToTimeInBuffer(annotation.start!), defaultPlayLength())
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
  var position = null
  if (sourceNode.playbackState == sourceNode.PLAYING_STATE)
    position = timeToPosition(
      Math.max(
        0,
        context.currentTime - startTime + startOffset - fixedButtonOffset
      )
    )
  else if (lastClick != null) {
    position = lastClick
  }
  if (
    selected != null &&
    annotations[selected].end != null &&
    (annotations[selected + 1] == null || annotations[selected + 1].end == null)
  ) {
    if (selected + 1 >= words.length) {
      message('danger', 'No next word to annotate')
      return
    }
      selectWord(startWord(selected + 1, addConst(annotations[selected].end!, 2)))
    $('#play-selection').click()
  } else {
    var wordIndex = nextWord()
    if (wordIndex != null && position != null) {
      selectWord(startWord(wordIndex, position))
      $('#play-selection').click()
    } else {
      if (wordIndex == null) message('danger', 'No next word to annotate')
      else message('danger', 'Place the marker first by clicking on the image')
    }
  }
})

$('#end-word').click(function (_e) {
  clear()
  var position = null
  if (sourceNode.playbackState == sourceNode.PLAYING_STATE)
    position = timeToPosition(
      Math.max(
        0,
        context.currentTime - startTime + startOffset - fixedButtonOffset
      )
    )
  else if (lastClick != null) {
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

function submit(next : any) {
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
        _.filter(annotations, (a) => !_.isUndefined(a.start)),
        function (a) {
          return {
            start: a.start,
            end: a.end,
            startTime: positionToAbsoluteTime(a.start!),
            endTime: positionToAbsoluteTime(a.end!),
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
          message(
            'success',
            'Thanks!<br/>Enter the following two characters back into Amazon Turk: ' +
              data.stoken
          )
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

$('#submit').click((_e) => submit((a : any) => a))

$('input[type="checkbox"],[type="radio"]')
  .not('#create-switch')
  .bootstrapSwitch()
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
    updateWordsWithAnnotations(
        _.filter(_.split(String($('#transcript-input').val()), ' '), (a) => a !== '')
    )
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
    const s = mkSegmentName(
      movieName,
      parseInt(val),
      parseInt(val) + (endS - startS)
    )
    $.get('/spectrograms/' + movieName + '/' + s + '.jpg', () => {
      reload(
        mkSegmentName(
          movieName,
          parseInt(val),
          parseInt(val) + (endS - startS)
        )
      )
    }).fail(() => {
        message('danger', "That goto location doesn't exist in this movie")
    })
  }
})

$('#go-to-last').click(function (_e) {
    $.get('/last-annotation',
          {
              movieName: movieName,
              startS: startS,
              endS: endS,
              worker: parameters.worker,
          },
          a => {
              if(a) {
                  const start = 2*_.floor((_.floor(a.startTime)/2))
                  reload(mkSegmentName(movieName, start, start+(endS-startS)))
              } else {
                  message('danger', "You don't have any annotations, can't go to the last one")
              }
          })
})

$('#replace-with-reference-annotation').click(function (_e) {
  stopPlaying()
  let reference_annotations =
    other_annotations_by_worker[current_reference_annotation]
  if (reference_annotations) {
    clear()
    _.map(annotations, function (a) {
      if (a) {
        selectWord(a)
        deleteWord(a)
      }
    })
    words = _.map(reference_annotations, (a) => a.word)
    updateWords(_.map(reference_annotations, (a) => a.word))
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
        $(a).removeClass('btn-default').addClass('btn-success')
      } else {
        $(a).removeClass('btn-success').addClass('btn-default')
      }
    })
    message('success', 'Loaded the reference annotation')
  } else {
    message('warning', 'No reference annotation exists')
  }
})

$('#fill-with-reference').click((_e) => {
  stopPlaying()
  const referenceAnnotations = other_annotations_by_worker[current_reference_annotation]
  if (referenceAnnotations) {
    clear()
    let existingAnnotations = _.map(annotations, cloneAnnotation)
    _.forEach(annotations, (a) => {
      if (a) {
        selectWord(a)
        deleteWord(a)
      }
    })
      existingAnnotations = _.filter(existingAnnotations, a => _.has(a, "start") && !_.isUndefined(a.start))
    const lastAnnotationEndTime = _.max(
      _.concat(
        -1,
        _.map(existingAnnotations, (a) => a.endTime)
      )
    )
    let mergedAnnotations = _.concat(
      existingAnnotations,
        // @ts-ignore
        _.filter(referenceAnnotations, (a : Annotation) => a.startTime > lastAnnotationEndTime)
    )
    let unusedReferenceAnnotations = _.filter(
      referenceAnnotations,
      (a) => a.startTime! <= lastAnnotationEndTime!
    )
    _.forEach(unusedReferenceAnnotations, (a) => removeAnnotation(_.clone(a)))
    words = _.map(mergedAnnotations, (a) => a.word)
    updateWords(_.map(mergedAnnotations, (a) => a.word))
    mergedAnnotations = _.map(mergedAnnotations, (a, k : number) => {
      let r = removeAnnotation(_.clone(a))
      r.index = k
      return r
    })
    annotations = mergedAnnotations
    _.map(mergedAnnotations, (a) => {
      if (a) {
        updateWord(a)
      }
    })
    current_reference_annotation = undefined
    $('.annotation').each((_i, a) => {
      if ($(a).text() == 'none') {
        $(a).removeClass('btn-default').addClass('btn-success')
      } else {
        $(a).removeClass('btn-success').addClass('btn-default')
      }
    })
    message('success', 'Filled with the reference annotation')
  } else {
    message('warning', 'No reference annotation exists')
  }
})

function mkSegmentName(movieName : string, start : number, end : number) {
  return (
    movieName +
    ':' +
    ('' + start).padStart(5, '0') +
    ':' +
    ('' + end).padStart(5, '0')
  )
}

$('#back-4-sec').click(function (_e) {
  reload(mkSegmentName(movieName, startS - 4, endS - 4))
})

$('#back-2-sec').click(function (_e) {
  reload(mkSegmentName(movieName, startS - 2, endS - 2))
})

$('#forward-2-sec').click(function (_e) {
  reload(mkSegmentName(movieName, startS + 2, endS + 2))
})

$('#forward-4-sec').click(function (_e) {
  reload(mkSegmentName(movieName, startS + 4, endS + 4))
})

$('#back-save-4-sec').click(function (_e) {
  submit(() =>
    reload(
      movieName +
        ':' +
        ('' + (startS - 4)).padStart(5, '0') +
        ':' +
        ('' + (endS - 4)).padStart(5, '0')
    )
  )
})

$('#back-save-2-sec').click(function () {
  submit(() =>
    reload(
      movieName +
        ':' +
        ('' + (startS - 2)).padStart(5, '0') +
        ':' +
        ('' + (endS - 2)).padStart(5, '0')
    )
  )
})

$('#forward-save-2-sec').click(function () {
  submit(() =>
    reload(
      movieName +
        ':' +
        ('' + (startS + 2)).padStart(5, '0') +
        ':' +
        ('' + (endS + 2)).padStart(5, '0')
    )
  )
})

$('#forward-save-4-sec').click(function () {
  submit(() =>
    reload(
      movieName +
        ':' +
        ('' + (startS + 4)).padStart(5, '0') +
        ':' +
        ('' + (endS + 4)).padStart(5, '0')
    )
  )
})

javascriptNode!.onaudioprocess = function (_audioProcessingEvent) {
  if (sourceNode && audioIsPlaying) {
    if (startTime == -1) startTime = context.currentTime
    redraw(context.currentTime - startTime + startOffset)
  }
}

function render_other_annotations(worker : string) {
  current_reference_annotation = worker
  let reference_annotations = other_annotations_by_worker[worker]
  if (reference_annotations) {
    _.forEach(other_annotations_by_worker, (as) =>
      _.forEach(as, removeAnnotation)
    )
    $('.annotation').each((_i, a) => {
      if ($(a).text() == worker) {
        $(a).removeClass('btn-default').addClass('btn-success')
      } else {
        $(a).removeClass('btn-success').addClass('btn-default')
      }
    })
    _.map(reference_annotations, (a) => updateBackgroundWord(worker, a))
    message('success', 'Showing the reference annotation')
  } else {
    message('warning', 'Cannot show reference annotation')
  }
}

function register_other_annotations(worker : string) {
  let reference_annotations = other_annotations_by_worker[worker]
  if (reference_annotations) {
    $('#annotations')
      .append(
        $('<button type="button" class="annotation btn btn-default">')
          .text(worker)
          .data('worker', worker)
          .click(() => render_other_annotations(worker))
      )
      .append(' ')
    message('success', 'Loaded the reference annotation')
  } else {
    message('warning', 'No reference annotation exists')
  }
}

function reload(segmentName : null | string) {
  if (loading) return
  stopPlaying()
  loading = true
  $('#words').empty()
  words = []
  $('#annotations').empty()
  $('#annotations').append(
    $('<button type="button" class="annotation btn btn-success">')
      .text('none')
      .data('worker', undefined)
      .click(() => {
        $('.annotation').each((i, a) => {
          current_reference_annotation = undefined
          if ($(a).text() == 'none') {
            $(a).removeClass('btn-default').addClass('btn-success')
          } else {
            $(a).removeClass('btn-success').addClass('btn-default')
          }
        })
        _.forEach(other_annotations_by_worker, (as) =>
          _.forEach(as, removeAnnotation)
        )
      })
  )
  _.forEach(other_annotations_by_worker, (as) => {
    _.forEach(as, removeAnnotation)
  })
  _.forEach(annotations, removeAnnotation)
  annotations = []
  if (segmentName) {
    setSegment(segmentName)
    let param = $.url().param()
    param.segment = segmentName
    window.history.pushState(
      $.url().param(),
      'Audio annotation',
      '/gui.html?' + $.param(param)
    )
  }

  $('#spectrogram').attr('src', '/spectrograms/' + movieName + '/' + segment + '.jpg')

  message('warning', 'Loading audio ...')

  $('#location-input').val(startS)

    $.when($.ajax({url: '/audio-clips/' + movieName + '/' + segment + '.mp3',
                   method: 'GET',
                   dataType: 'arraybuffer',
                  }),
           $.ajax({url: '/audio-clips/' + movieName + '/' + segment + '-0.5.mp3',
                   method: 'GET',
                   dataType: 'arraybuffer',
                  }),
           $.get('/annotations',
                 {
                     movieName: movieName,
                     startS: startS,
                     endS: endS,
                     workers: _.concat([parameters.worker], references),
                 })).done((clip_, clipHalf_, ass_) => {
                     const clip = clip_[0]
                     const clipHalf = clipHalf_[0]
                     const ass = ass_[0]
                     context.decodeAudioData(
                         clip,
                         function (audioBuffer) {
                             buffers['normal'] = audioBuffer
                             setup(buffers['normal'])
                         },
                         onError)
                     context.decodeAudioData(
                         clipHalf,
                         function (audioBuffer) {
                             buffers['half'] = audioBuffer
                             setup(buffers['half'])
                         },
                         onError)
                     _.forEach(ass, (as) => {
                         other_annotations_by_worker[as.worker] = _.map(
                             as.annotations,
                             fillAnnotationPositions
                         )
                         register_other_annotations(as.worker)
                     })
                     function loadAnnotations(id : string) {
                         if (_.isEmpty(words)) {
                             words = _.map(other_annotations_by_worker[id], (a) => a.word)
                             updateWords(words)
                         }
                         render_other_annotations(id)
                     }
                     loadAnnotations(parameters.worker)
                     $('#replace-with-reference-annotation').click()
                     if(_.has(other_annotations_by_worker, parameters.defaultReference))
                         loadAnnotations(parameters.defaultReference)
                     loading = false
                     message('success', 'Loaded ' + segment)
                 });
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
  .attr(
    'data-bootstro-content',
    'We try to guess which words might have been said.'
  )
  .attr('data-bootstro-placement', 'top')
  .attr('data-bootstro-step', '3')

$('#edit-transcript')
  .addClass('bootstro')
  .attr('data-bootstro-title', 'Transcript')
  .attr(
    'data-bootstro-content',
    'Listen to the audio and edit the words. Words may be wrong or missing.'
  )
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
  .attr(
    'data-bootstro-content',
    "If a word isn't relevant or annotated incorrectly you can remove it."
  )
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
  .attr(
    'data-bootstro-content',
    'You can save your work on the current segment by submitting it.'
  ) // TODO Update for MTurk
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
