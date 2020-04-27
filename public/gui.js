// TODO No words inside other words
// TODO Have to serve up: the image, the audio, the words
// TODO Previous page for annotating words
// TODO Script to generate the spectrograms should remove useless high frequencies
// TODO split up audio into overlapping 5s chunks)
// TODO Metrics (cliks, locations, ?, words annotated)
// TODO submit should check for missing internal words
// TODO Unique ID generation
// TODO HIT Information in the submission, like ID number, etc
// TODO check word order
// TODO Wider spectrograms
// TOOD Instructions
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

// http://localhost:3000/gui.html?source=home-alone-2&segment=venom%3A00098%3A00102&id=1&notranscript=0&worker=andrei&references=rev&defaultReference=rev

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

var canvas = $('#canvas')[0]
var ctx = canvas.getContext('2d')

var contextClass =
  window.AudioContext ||
  window.webkitAudioContext ||
  window.mozAudioContext ||
  window.oAudioContext ||
  window.msAudioContext

var endTime = 100000 // infinity seconds..

if (contextClass) {
  var context = new contextClass()
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

function message(kind, msg) {
  $('#loading')
    .html('<h4><div class="alert alert-' + kind + '">' + msg + '</span></h4>')
    .removeClass('invisible')
}

var parameters = $.url().param()

if (!Array.prototype.last) {
  Array.prototype.last = () => {
    return this[this.length - 1]
  }
}

var segment
var startS
var endS
var movieName
var bufferKind
// Fetched based on the segment
var remoteWords
var words = []
var mode
var token
var reason = 'annotated'
var browser = navigator.userAgent.toString()
var other_annotations_by_worker = {} // previous_annotation
// TODO Should expose this so that we can change the default
var current_reference_annotation = parameters.defaultReference
var references = _.isUndefined(parameters.references)
  ? []
  : _.split(parameters.references, ',')

// This has a race condition between stopping and start the audio, that's why we
// have a counter. 'onended' is called after starting a new audio playback,
// because the previous playback started.
var audioIsPlaying = 0

function setSegment(segmentName) {
  s = segmentName.split(':')
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
      id = data.id
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

function keyboardShortcutsOff() {
  $(document).unbind('keydown', 'p')
  $(document).unbind('keydown', 'r')
  $(document).unbind('keydown', 't')
  $(document).unbind('keydown', 'e')
  $(document).unbind('keydown', 'd')
  $(document).unbind('keydown', 's')
  $(document).unbind('keydown', 'w')
  $(document).unbind('keydown', 'a')
  $(document).unbind('keydown', 'm')
  $(document).unbind('keydown', 'b')
  $(document).unbind('keydown', 'f')
  $(document).unbind('keydown', 'l')
  $(document).unbind('keydown', 'n')
  $(document).unbind('keydown', 'y')
}

function tokenMode() {
  stop()
  mode = 'token'
  bufferKind = 'normal'
  $('.transcription-gui').addClass('display-none')
  $('.annotation-gui').addClass('display-none')
  keyboardShortcutsOff()
}

function transcriptionMode() {
  mode = 'transcription'
  bufferKind = 'normal'
  $('.transcription-gui').removeClass('display-none')
  $('.annotation-gui').addClass('display-none')
  keyboardShortcutsOff()
}

function annotationMode() {
  mode = 'annotation'
  bufferKind = 'half'
  $('.transcription-gui').addClass('display-none')
  $('.annotation-gui').removeClass('display-none')
  keyboardShortcutsOn()
  // if(sourceNode) {
  //     stop()
  //     play(0)
  // }
}

annotationMode()

// delay between hearing a word, figuring out that it's the one
// you want, pressing the button and the event firing
var fixedButtonOffset = 0.05
function defaultPlayLength() {
  if (bufferKind == 'half') {
    return 1
  }
  if (bufferKind == 'normal') {
    return 0.5
  }
}

var buffers = {}
var sourceNode
var javascriptNode
var hot = chroma
  .scale(['black', 'red', 'yellow', 'white'])
  .domain([0, 300])
  .mode('rgb')
var startTime = 0
var startOffset = 0
var lastClick = null
var selected = null
var annotations
var mute = false
var minimumOffset = 8
var nextStop

var svg = d3.select('#d3')
svg
  .append('rect')
  .attr('width', $('#d3').attr('width'))
  .attr('height', $('#d3').attr('height'))
  .attr('fill', '#ffffff')
  .attr('fill-opacity', 0.0)
  .on('click', function (d, i) {
    $('#canvas').click()
  })
var svgReferenceAnnotations = svg.append('g')
var svgAnnotations = svg.append('g')

function drag(annotation, position) {
  return d3.behavior
    .drag()
    .on('drag', function (d, i) {
      selectWord(annotation)
      var destination = d3.event.x
      if (position == 'start' && annotation.end != null) {
        destination = Math.min(annotation.end - minimumOffset, d3.event.x)
      } else if (position == 'end') {
        destination = Math.max(annotation.start + minimumOffset, d3.event.x)
      } else {
        destination = d3.event.x
      }
      annotation[position] = destination
      updateWord(annotation)
    })
    .on('dragend', function (d, i) {
      selectWord(annotation)
      $('#play-selection').click()
    })
}

function loadSound(url, kind, fn) {
  var request = new XMLHttpRequest()
  request.open('GET', url, true)
  request.responseType = 'arraybuffer'
  request.onload = () => {
    context.decodeAudioData(
      request.response,
      function (audioBuffer) {
        buffers[kind] = audioBuffer
        setup(buffers[kind])
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

function setup(buffer) {
  sourceNode = context.createBufferSource()
  sourceNode.connect(javascriptNode)
  sourceNode.buffer = buffer
  startTime = context.currentTime
  sourceNode.onended = () => {
    audioIsPlaying -= 1
    redraw(null)
  }
  if (!mute) sourceNode.connect(context.destination)
  // Maybe?
  // sourceNode.playbackRate.value = 0.5
  // sourceNode.loop = true
}

function play(offset, duration) {
  startTime = context.currentTime
  startOffset = offset
  if (duration != null) {
    endTime = offset + duration
    audioIsPlaying += 1
    sourceNode.start(0, offset, duration)
  } else {
    endTime = 1000000 // infinity seconds..
    audioIsPlaying += 1
    sourceNode.start(0, offset)
  }
}

function stop() {
  // Might need to do: player.sourceNode.noteOff(0) on some browsers?
  try {
    sourceNode.stop(0)
    startOffset = context.currentTime - startTime + startOffset
      redraw(null)
  } catch (err) {
    // Calling stop more than once should be safe, although
    // catching all errors is bad form
  }
}

function onError(e) {
  console.log(e)
}

function timeToPosition(time) {
  return (time / (endS - startS)) * canvas.width
}
function timeInBufferToPosition(time) {
  return (time / sourceNode.buffer.duration) * canvas.width
}
function positionToTime(position) {
  return (position * (endS - startS)) / canvas.width
}
function positionToTimeInBuffer(position) {
  return (position * sourceNode.buffer.duration) / canvas.width
}
function positionToAbsoluteTime(position) {
  return startS + (position * (endS - startS)) / canvas.width
}

function redraw(timeOffset) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (timeOffset < endTime) {
    var offset = timeInBufferToPosition(timeOffset)
    if (timeOffset != null) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fillRect(offset, 1, 1, canvas.height)
    }
  }
  if (lastClick != null) {
    ctx.fillStyle = 'rgba(200, 0, 0, 0.9)'
    ctx.fillRect(lastClick, 1, 2, canvas.height)
  }
}

function mousePosition(canvas) {
  var rect = canvas.getBoundingClientRect()
  return {
    x: d3.event.clientX - rect.left,
    y: d3.event.clientY - rect.top,
  }
}

function updateWords(words) {
  $('#words').empty()
  annotations = {}
  _.forEach(words, function (word, index) {
    annotations[index] = { index: index }
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
          startWord($(this).data('index'), annotations[selected].end + 2)
        )
        $('#play-selection').click()
      } else
        message('danger', 'Place the marker first by clicking on the image')
    }
  })
}

function levenshteinAlignment(iWords, i, jWords, j, cache) {
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

function alignWords(newWords, oldWords) {
    cache = []
    _.forEach(_.range(0,newWords.length+2), i => {
        cache[i] = []
        _.forEach(_.range(0,oldWords.length+2), j => { cache[i][j] = false })
    })
    return levenshteinAlignment(newWords, 0, oldWords, 0, cache)
}

function cloneAnnotation(a) {
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

function updateWordsWithAnnotations(newWords) {
  $('#words').empty()
  oldWords = words
  oldAnnotations = _.cloneDeep(annotations)
  _.forEach(annotations, removeAnnotation)
  alignment = alignWords(newWords, oldWords)
  words = newWords
  annotations = {}
  _.forEach(words, function (word, index) {
    annotations[index] = {}
    if (_.has(alignment, index)) {
      old = oldAnnotations[alignment[index]]
      annotations[index].start = old.start
      annotations[index].end = old.end
      annotations[index].startTime = old.startTime
      annotations[index].endTime = old.endTime
      annotations[index].lastClickTimestamp = old.lastClickTimestamp
    }
    annotations[index].index = index
    annotations[index].word = word
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
          startWord($(this).data('index'), annotations[selected].end + 2)
        )
        $('#play-selection').click()
      } else
        message('danger', 'Place the marker first by clicking on the image')
    }
  })
  _.forEach(annotations, updateWord)
}

function startWord(index, position) {
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
      end: Math.min(position + words[index].length * 10, canvas.width),
    }
    updateWord(annotations[index])
    return annotations[index]
  } else message('danger', "Words can't start at the same position")
}

function closestWord(position) {
  return _.sortBy(
    _.filter(annotations, function (annotation) {
      return annotation.start != null && annotation.start < position
    }),
    function (annotation, index) {
      return position - annotation.start
    }
  )[0]
}

function endWord(word, position) {
  if (!word) {
    message('danger', 'No word to end')
    return
  }
  if (word.end != null) {
    message('danger', 'Words already ended')
    return
  }
  if (Math.abs(position - word.start) < 3) {
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

function annotationColor(annotation) {
  if (annotation.end != null) {
    if (annotation.index == selected) return 'orange'
    else return 'lawngreen'
  } else {
    return 'red'
  }
}

function clearWordLabels(annotation) {
  $('.word')
    .eq(annotation.index)
    .removeClass('label-success')
    .removeClass('label-warning')
    .removeClass('label-info')
    .removeClass('label-primary')
    .removeClass('label-danger')
}

function updateWord(annotation) {
  if (annotation.start != null) {
    clearWordLabels(annotation)
    if (annotation.end == null)
      $('.word').eq(annotation.index).addClass('label-danger')
    else if (annotation.index == selected)
      $('.word').eq(annotation.index).addClass('label-warning')
    else $('.word').eq(annotation.index).addClass('label-success')
    if (!annotation.group) {
      annotation.group = svgAnnotations.append('g')
      annotation.id = annotation.start
      annotation.group.datum(annotation.index)
    }
    if (!annotation.text)
      annotation.text = annotation.group.append('text').text(annotation.word)
    annotation.text
      .attr('font-family', 'sans-serif')
      .attr('font-size', '15px')
      .attr('class', 'unselectable')
      .attr('fill', annotationColor(annotation))
      .on('click', () => {
        clear()
        selectWord(annotation)
        lastClick = mousePosition(canvas).x
        $('#play-selection').click()
      })
    if (!annotation.startLine) {
      annotation.startLine = annotation.group.append('line')
      annotation.startLineHandle = annotation.group
        .append('line')
        .call(drag(annotation, 'start'))
        .on('click', () => {
          clear()
          selectWord(annotation)
          lastClick = mousePosition(canvas).x
          $('#play-selection').click()
        })
    }
    annotation.startLine
      .attr('x1', annotation.start)
      .attr('x2', annotation.start)
      .attr('y1', '0')
      .attr('y2', $('#container').height())
      .attr('stroke', annotationColor(annotation))
      .attr('opacity', 0.7)
      .attr('stroke-width', '2')
    annotation.startLineHandle
      .attr('x1', annotation.start + 3)
      .attr('x2', annotation.start + 3)
      .attr('y1', '0')
      .attr('y2', $('#container').height())
      .attr('stroke', annotationColor(annotation))
      .attr('opacity', 0)
      .attr('stroke-width', '10')
    if (annotation.end != null) {
      if (!annotation.filler) {
        annotation.filler = annotation.group
          .insert('rect', ':first-child')
          .on('click', () => {
            clear()
            selectWord(annotation)
            lastClick = mousePosition(canvas).x
            $('#play-selection').click()
          })
      }
      annotation.filler
        .attr('x', annotation.start)
        .attr('y', 0)
        .attr('width', annotation.end - annotation.start)
        .attr('height', $('#container').height())
        .attr('opacity', 0.1)
        .attr('stroke', annotationColor(annotation))
        .attr('fill', annotationColor(annotation))
      if (!annotation.endLine) {
        annotation.endLine = annotation.group.append('line')
        annotation.endLineHandle = annotation.group
          .append('line')
          .call(drag(annotation, 'end'))
          .on('click', () => {
            clear()
            selectWord(annotation)
            lastClick = mousePosition(canvas).x
            $('#play-selection').click()
          })
      }
      annotation.endLine
        .attr('x1', annotation.end)
        .attr('x2', annotation.end)
        .attr('y1', '0')
        .attr('y2', $('#container').height())
        .attr('stroke', annotationColor(annotation))
        .attr('opacity', 0.7)
        .attr('stroke-width', '2')
      annotation.endLineHandle
        .attr('x1', annotation.end - 3)
        .attr('x2', annotation.end - 3)
        .attr('y1', '0')
        .attr('y2', $('#container').height())
        .attr('stroke', annotationColor(annotation))
        .attr('opacity', 0)
        .attr('stroke-width', '10')
      if (!annotation.topLine)
        annotation.topLine = annotation.group.append('line')
      annotation.topLine
        .attr('x1', annotation.start)
        .attr('x2', annotation.end)
        .attr('y1', '466')
        .attr('y2', '466')
        .attr('stroke', annotationColor(annotation))
        .attr('opacity', 0.7)
        .style('stroke-dasharray', '3, 3')
        .attr('stroke-width', '2')
      annotation.text
        .attr('x', (annotation.end - annotation.start) / 2 + annotation.start)
        .attr('y', '490')
        .attr('text-anchor', 'middle')
    } else {
      annotation.text.attr('x', annotation.start + 4).attr('y', '490')
    }
  } else {
    $('.word').eq(annotation.index).addClass('label-info')
  }
}

function removeAnnotation(annotation) {
  if (annotation.startLine) {
    annotation.startLine.remove()
    delete annotation.startLine
    annotation.startLineHandle.remove()
    delete annotation.startLineHandle
  }
  if (annotation.endLine) {
    annotation.endLine.remove()
    delete annotation.endLine
    annotation.endLineHandle.remove()
    delete annotation.endLineHandle
  }
  if (annotation.filler) {
    annotation.filler.remove()
    delete annotation.filler
  }
  if (annotation.topLine) {
    annotation.topLine.remove()
    delete annotation.topLine
  }
  if (annotation.text) {
    annotation.text.remove()
    delete annotation.text
  }
  if (annotation.group) {
    annotation.group.remove()
    delete annotation.group
  }
  return annotation
}

function deleteWord(annotation) {
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

function fillAnnotationPositions(annotation) {
  annotation.start = timeToPosition(annotation.startTime - startS)
  annotation.end = timeToPosition(annotation.endTime - startS)
  if (!annotation.lastClickTimestamp) annotation.lastClickTimestamp = -1
  return annotation
}

function updateBackgroundWord(worker, annotation) {
  if (annotation.start != null) {
    if (!annotation.group) {
      annotation.group = svgReferenceAnnotations.append('g')
      annotation.id = worker + ':' + annotation.start
      annotation.group.datum(worker + ':' + annotation.start)
    }
    if (!annotation.text)
      annotation.text = annotation.group.append('text').text(annotation.word)
    annotation.text
      .attr('font-family', 'sans-serif')
      .attr('font-size', '15px')
      .attr('font-weight', 'bold')
      .attr('class', 'unselectable')
      .attr('fill', 'white')
      .on('click', () => {
        lastClick = mousePosition(canvas).x
        playAnnotation(annotation)
      })
    if (!annotation.startLine) {
      annotation.startLine = annotation.group.append('line')
      annotation.startLineHandle = annotation.group
        .append('line')
        .on('click', () => {
          lastClick = mousePosition(canvas).x
          playAnnotation(annotation)
        })
    }
    annotation.startLine
      .attr('x1', annotation.start)
      .attr('x2', annotation.start)
      .attr('y1', '0')
      .attr('y2', $('#container').height())
      .attr('stroke', 'white')
      .attr('opacity', 0.7)
      .attr('stroke-width', '2')
    annotation.startLineHandle
      .attr('x1', annotation.start + 3)
      .attr('x2', annotation.start + 3)
      .attr('y1', '0')
      .attr('y2', $('#container').height())
      .attr('stroke', 'white')
      .attr('opacity', 0)
      .attr('stroke-width', '10')
    if (annotation.end != null) {
      if (!annotation.filler) {
        annotation.filler = annotation.group
          .insert('rect', ':first-child')
          .on('click', () => {
            lastClick = mousePosition(canvas).x
            playAnnotation(annotation)
          })
      }
      annotation.filler
        .attr('x', annotation.start)
        .attr('y', 0)
        .attr('width', annotation.end - annotation.start)
        .attr('height', $('#container').height())
        .attr('opacity', 0.1)
        .attr('stroke', 'white')
        .attr('fill', 'white')
      if (!annotation.endLine) {
        annotation.endLine = annotation.group.append('line')
        annotation.endLineHandle = annotation.group
          .append('line')
          .on('click', () => {
            lastClick = mousePosition(canvas).x
            playAnnotation(annotation)
          })
      }
      annotation.endLine
        .attr('x1', annotation.end)
        .attr('x2', annotation.end)
        .attr('y1', '0')
        .attr('y2', $('#container').height())
        .attr('stroke', 'white')
        .attr('opacity', 0.7)
        .attr('stroke-width', '2')
      annotation.endLineHandle
        .attr('x1', annotation.end - 3)
        .attr('x2', annotation.end - 3)
        .attr('y1', '0')
        .attr('y2', $('#container').height())
        .attr('stroke', 'white')
        .attr('opacity', 0)
        .attr('stroke-width', '10')
      if (!annotation.topLine)
        annotation.topLine = annotation.group.append('line')
      annotation.topLine
        .attr('x1', annotation.start)
        .attr('x2', annotation.end)
        .attr('y1', '466')
        .attr('y2', '466')
        .attr('stroke', 'white')
        .attr('opacity', 0.7)
        .style('stroke-dasharray', '3, 3')
        .attr('stroke-width', '2')
      annotation.text
        .attr('x', (annotation.end - annotation.start) / 2 + annotation.start)
        .attr('y', '490')
        .attr('text-anchor', 'middle')
    } else {
      annotation.text.attr('x', annotation.start + 4).attr('y', '490')
    }
  } else {
    $('.word').eq(annotation.index).addClass('label-info')
  }
}

function clearSelection() {
  selected = null
  _.forEach(annotations, updateWord)
}

function find_annotation(id) {
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
  let workerAnnotations = svgAnnotations.selectAll('g').sort(function (a, b) {
    // TODO Selection
    return d3.ascending(
      find_annotation(a).lastClickTimestamp,
      find_annotation(b).lastClickTimestamp
    )
  })[0][0]
  if (!_.isUndefined(workerAnnotations)) {
    return workerAnnotations
  }
  return svgReferenceAnnotations.selectAll('g').sort(function (a, b) {
    // TODO Selection
    return d3.ascending(
      find_annotation(a).lastClickTimestamp,
      find_annotation(b).lastClickTimestamp
    )
  })[0][0].__data__
}

function selectWord(annotation) {
  if (annotation != null) {
    lastClick = null
    selected = annotation.index
    annotation.lastClickTimestamp = Date.now()
    _.forEach(annotations, updateWord)
    shuffleSelection()
  }
}

function nextWord() {
  var word = _.filter(annotations, function (annotation) {
    return annotation.start == null
  })[0]
  if (word) return word.index
  else return null
}

function nextAnnotation(index) {
  var word = _.filter(annotations, function (annotation) {
    return annotation.index > index && annotation.start != null
  })[0]
  if (word) return word.index
  else return null
}

function previousAnnotation(index) {
  var word = _.filter(annotations, function (annotation) {
    return annotation.index < index && annotation.start != null
  }).last()
  if (word) return word.index
  else return null
}

$('#canvas').click(function (e) {
  clear()
  stop()
  setup(buffers[bufferKind])
  lastClick = mousePosition(canvas).x
  play(positionToTimeInBuffer(lastClick), defaultPlayLength())
})

$('#play').click(function (e) {
  clear()
  stop()
  setup(buffers[bufferKind])
  play(0)
})
$('#play-transcript').click(function (e) {
  $('#play').click()
})
$('#stop').click(function (e) {
  clear()
  stop()
  redraw(startOffset)
})
$('#delete-selection').click(function (e) {
  clear()
  if (selected != null) {
    var index = annotations[selected].index
    deleteWord(annotations[selected])
    if (previousAnnotation(index) != null)
      selectWord(annotations[previousAnnotation(index)])
    else selectWord(annotations[nextAnnotation(index)])
  } else message('danger', 'Click a word to select it first')
})

function playAnnotation(annotation) {
  stop()
  setup(buffers[bufferKind])
  if (annotation.end != null)
    play(
      positionToTimeInBuffer(annotation.start),
      positionToTimeInBuffer(annotation.end) -
        positionToTimeInBuffer(annotation.start)
    )
  else play(positionToTimeInBuffer(annotation.start), defaultPlayLength())
}

$('#play-selection').click(function (e) {
  clear()
  if (selected != null) {
    stop()
    setup(buffers[bufferKind])
    playAnnotation(annotations[selected])
  } else message('danger', 'Click a word to select it first')
})

$('#start-next-word').click(function (e) {
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
    selectWord(startWord(selected + 1, annotations[selected].end + 2))
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

$('#end-word').click(function (e) {
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

$('#reset').click(function (e) {
  clear()
  location.reload()
})

function submit(next) {
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
      remoteWords: remoteWords,
      selected: selected,
      start: segment.split(':')[1],
      end: segment.split(':')[2],
      startTime: startTime,
      startOffset: startOffset,
      lastClick: lastClick,
      reason: reason,
      worker: parameters.worker,
      annotations: _.map(
        _.filter(annotations, (a) => !_.isUndefined(a.start)),
        function (a) {
          return {
            start: a.start,
            end: a.end,
            startTime: positionToAbsoluteTime(a.start),
            endTime: positionToAbsoluteTime(a.end),
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

$('#submit').click((e) => submit((a) => a))

$('input[type="checkbox"],[type="radio"]')
  .not('#create-switch')
  .bootstrapSwitch()
$('#toggle-audio').on('switchChange.bootstrapSwitch', () => {
  stop()
  mute = !mute
})
$('#toggle-speed').on('switchChange.bootstrapSwitch', () => {
  stop()
  if (bufferKind == 'half') bufferKind = 'normal'
  else if (bufferKind == 'normal') bufferKind = 'half'
})

$('#provided-transcript').click(function (event) {
  words = remoteWords
  updateWords(words)
  annotationMode()
})

$('#new-transcript').click(function (event) {
  words = $('#transcript-box').val().split(' ')
  updateWords(words)
  annotationMode()
})

$('#no-speech').click(function (event) {
  var reason = 'no-speech'
  $('#submit').click()
})

$('#too-noisy').click(function (event) {
  var reason = 'too-noisy'
  $('#submit').click()
})

$('#cant-understand').click(function (event) {
  var reason = 'cant-understand'
  $('#submit').click()
})

$('#simultaneous-speakers').click(function (event) {
  var reason = 'simultaneous-speakers'
  $('#submit').click()
})

editingTranscriptMode = false
$('#edit-transcript').click(function (event) {
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
  }
  editingTranscriptMode = !editingTranscriptMode
})

$('#transcript-input').keypress(function (event) {
  if (event.which == 13) {
    event.preventDefault()
    updateWordsWithAnnotations(
      _.filter(_.split($('#transcript-input').val(), ' '), (a) => a !== '')
    )
    $('#edit-transcript').click()
  }
})

$('#location-input').keypress(function (event) {
  if (event.which == 13) {
    event.preventDefault()
    $('#go-to-location').click()
  }
})

$('#go-to-location').click(function (event) {
  const n = parseInt($('#location-input').val())
  if ('' + n !== $('#location-input').val()) {
    message('danger', "Go to location isn't an integer")
  } else {
    const s = mkSegmentName(
      movieName,
      parseInt($('#location-input').val()),
      parseInt($('#location-input').val()) + (endS - startS)
    )
    $.get('/spectrograms/' + s + '.jpg', () => {
      reload(
        mkSegmentName(
          movieName,
          parseInt($('#location-input').val()),
          parseInt($('#location-input').val()) + (endS - startS)
        )
      )
    }).fail(() => {
        message('danger', "That goto location doesn't exist in this movie")
    })
  }
})

$('#go-to-last').click(function (event) {
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

$('#replace-with-reference-annotation').click(function (event) {
  stop()
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
    $('.annotation').each((i, a) => {
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

$('#fill-with-reference').click((event) => {
  stop()
  const referenceAnnotations =
    other_annotations_by_worker[current_reference_annotation]
  if (referenceAnnotations) {
    clear()
    let existingAnnotations = _.map(annotations, cloneAnnotation)
    _.forEach(annotations, (a) => {
      if (a) {
        selectWord(a)
        deleteWord(a)
      }
    })
    existingAnnotations = _.filter(a => start && !_.isUndefined(a.start))
    const lastAnnotationEndTime = _.max(
      _.concat(
        -1,
        _.map(existingAnnotations, (a) => a.endTime)
      )
    )
    let mergedAnnotations = _.concat(
      existingAnnotations,
      _.filter(referenceAnnotations, (a) => a.startTime > lastAnnotationEndTime)
    )
    let unusedReferenceAnnotations = _.filter(
      referenceAnnotations,
      (a) => a.startTime <= lastAnnotationEndTime
    )
    _.forEach(unusedReferenceAnnotations, (a) => removeAnnotation(_.clone(a)))
    words = _.map(mergedAnnotations, (a) => a.word)
    updateWords(_.map(mergedAnnotations, (a) => a.word))
    mergedAnnotations = _.map(mergedAnnotations, (a, k) => {
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
    $('.annotation').each((i, a) => {
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

function mkSegmentName(movieName, start, end) {
  return (
    movieName +
    ':' +
    ('' + start).padStart(5, '0') +
    ':' +
    ('' + end).padStart(5, '0')
  )
}

$('#back-4-sec').click(function (event) {
  reload(mkSegmentName(movieName, startS - 4, endS - 4))
})

$('#back-2-sec').click(function (event) {
  reload(mkSegmentName(movieName, startS - 2, endS - 2))
})

$('#forward-2-sec').click(function (event) {
  reload(mkSegmentName(movieName, startS + 2, endS + 2))
})

$('#forward-4-sec').click(function (event) {
  reload(mkSegmentName(movieName, startS + 4, endS + 4))
})

$('#back-save-4-sec').click(function (event) {
  submit((a) =>
    reload(
      movieName +
        ':' +
        ('' + (startS - 4)).padStart(5, '0') +
        ':' +
        ('' + (endS - 4)).padStart(5, '0')
    )
  )
})

$('#back-save-2-sec').click(function (event) {
  submit((a) =>
    reload(
      movieName +
        ':' +
        ('' + (startS - 2)).padStart(5, '0') +
        ':' +
        ('' + (endS - 2)).padStart(5, '0')
    )
  )
})

$('#forward-save-2-sec').click(function (event) {
  submit((a) =>
    reload(
      movieName +
        ':' +
        ('' + (startS + 2)).padStart(5, '0') +
        ':' +
        ('' + (endS + 2)).padStart(5, '0')
    )
  )
})

$('#forward-save-4-sec').click(function (event) {
  submit((a) =>
    reload(
      movieName +
        ':' +
        ('' + (startS + 4)).padStart(5, '0') +
        ':' +
        ('' + (endS + 4)).padStart(5, '0')
    )
  )
})

javascriptNode.onaudioprocess = function (audioProcessingEvent) {
  if (sourceNode && audioIsPlaying) {
    if (startTime == -1) startTime = context.currentTime
    redraw(context.currentTime - startTime + startOffset)
  }
}

function render_other_annotations(worker) {
  current_reference_annotation = worker
  let reference_annotations = other_annotations_by_worker[worker]
  if (reference_annotations) {
    _.forEach(other_annotations_by_worker, (as) =>
      _.forEach(as, removeAnnotation)
    )
    $('.annotation').each((i, a) => {
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

function register_other_annotations(worker) {
  let reference_annotations = other_annotations_by_worker[worker]
  if (reference_annotations) {
    $('#annotations')
      .append(
        $('<button type="button" class="annotation btn btn-default">')
          .text(worker)
          .data('worker', worker)
          .click((none) => render_other_annotations(worker))
      )
      .append(' ')
    message('success', 'Loaded the reference annotation')
  } else {
    message('warning', 'No reference annotation exists')
  }
}

function reload(segmentName) {
  if (loading) return
  stop()
  loading = true
  $('#words').empty()
  words = []
  $('#annotations').empty()
  $('#annotations').append(
    $('<button type="button" class="annotation btn btn-success">')
      .text('none')
      .data('worker', undefined)
      .click((none) => {
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
  annotations = undefined
  if (segmentName) {
    setSegment(segmentName)
    param = $.url().param()
    param.segment = segmentName
    window.history.pushState(
      $.url().param(),
      'Audio annotation',
      '/gui.html?' + $.param(param)
    )
  }

  $('#spectrogram').attr('src', '/spectrograms/' + segment + '.jpg')

  message('warning', 'Loading audio ...')

  $('#location-input').val(startS)

  loadSound('/audio-clips/' + segment + '-0.5.wav', 'half', () => {
    message('success', 'Loaded ' + segment)
    loadSound('/audio-clips/' + segment + '.wav', 'normal', () => {
      message('success', 'Loaded ' + segment)
      $.get(
        '/annotations',
        {
          movieName: movieName,
          startS: startS,
          endS: endS,
          workers: _.concat([parameters.worker], references),
        },
        function (ass) {
            _.forEach(ass, (as) => {
            other_annotations_by_worker[as.worker] = _.map(
              as.annotations,
              fillAnnotationPositions
            )
            register_other_annotations(as.worker)
          })
          function loadAnnotations(id) {
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
        }
      )
    })
  })
}

reload(false)

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
    'Sometimes we have reference annotation available, you can select any references here. This includes any previous work you have done. They appear in white on the audio.'
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
  bootstro.start('.bootstro', {
    finishButton:
      '<button class="btn btn-mini btn-warning bootstro-finish-btn"><i class="icon-ok"></i>Exit tutorial</button>',
  })
})
