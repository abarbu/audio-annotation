// TODO End of movie
// TODO Will this work on my phone?
// TODO Previous page for annotating words
// TODO Metrics (cliks, locations, ?, words annotated)
// TODO submit should check for missing internal words
// TODO Unique ID generation
// TODO HIT Information in the submission, like ID number, etc
// TODO Maybe test for audio somehow before the person is qualified for the HIT
// TODO If we haven't loaded in 30 seconds, do something about it

function drawWaveformFromBuffer(width: number, height: number, shift: number, buffer: AudioBuffer) {
  var data = buffer.getChannelData(0)
  var step = Math.ceil(data.length / width)
  var amp = height / 2
  let normalize = Math.max(Math.abs(_.min(data)!), Math.abs(_.max(data)!))
  let offset = _.mean(data)
  waveformCtx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  for (var i = 0; i < width; i++) {
    var min = 1.0
    var max = -1.0
    var datum
    for (var j = 0; j < step; j++) {
      datum = data[i * step + j]
      if (datum < min) min = datum
      if (datum > max) max = datum
    }
    min = (min - offset) / normalize
    max = (max - offset) / normalize
    if (!_.isUndefined(datum)) {
      waveformCtx.fillRect(i, shift + min * amp, 1, (max - min) * amp)
    }
  }
}


function drawWaveform() {
  waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height)
  if (buffers[BufferType.normal]) {
    drawWaveformFromBuffer(
      waveformCanvas.width,
      waveformCanvas.height * 0.1,
      waveformCanvas.height * 0.95,
      buffers[BufferType.normal]!
    )
  }
}

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
      return '99%'
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

/*
function clickOnCanvas() {
  clear()
  setup(buffers[bufferKind]!)
  lastClick = positionToAbsoluteTime(to<PositionInSpectrogram>(mousePosition().x))
  // @ts-ignore
  play(timeInMovieToTimeInBuffer(lastClick), d3.event.shiftKey ? endS - startS : defaultPlayLength())
}
*/
function resizeCanvas() {
  viewer_width = Math.min($('.panel').width()!, 3000) // 2240 // 1200
  viewer_height = Math.min(window.innerHeight * 0.5, 800) // 830 // 565
  viewer_border = 0
  canvas.width = viewer_width
  canvas.height = viewer_height
  waveformCanvas.width = viewer_width
  waveformCanvas.height = viewer_height
  drawWaveform()
  $('#d3')
    .attr('width', viewer_width)
    .attr('height', viewer_height + viewer_border)
  $('#container')
    .css('width', viewer_width)
    .css('height', viewer_height + viewer_border)
}

resizeCanvas()

$(window).resize(() => {
  stop()
  resizeCanvas()
})

function message(kind: string, msg: string) {
  if (kind != 'success' && kind != 'warning')
    recordMessage({
      level: kind,
      data: msg,
    })
  $('#loading')
    .html('<h4><div class="alert alert-' + kind + '">' + msg + '</span></h4>')
    .removeClass('invisible')
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
if ($.url().param().token) {
  token = $.url().param().token
  $.ajax({
    type: 'POST',
    data: JSON.stringify({ token: $.url().param().token }),
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
  if ($.url().param().segment) setSegment($.url().param().segment)
  else setSegment('test:0:1')
}

if ($.url().param().nohelp) $('#help-panel').remove()

/*
function tokenMode() {
  stopPlaying()
  mode = 'token'
  bufferKind = BufferType.normal
  $('.transcription-gui').addClass('display-none')
  $('.annotation-gui').addClass('display-none')
  // TOOD Maybe ressurect this one day?
  // keyboardShortcutsOff()
}
*/
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
function defaultPlayLength(): TimeInBuffer {
  switch (bufferKind) {
    case BufferType.half:
      return to(1.4)
    case BufferType.normal:
      return to(0.7)
  }
}


function clear() {
  $('#loading').addClass('invisible')
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

/*
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
    const index = $(this).data('index')
    recordMouseClick(e, '.word', index + '')
    wordClickHandler(index)
  })
}
*/

function annotationColor(annotation: Annotation, isReference: boolean) {
  if (isReference) return '#5bc0de'
  if (annotation.endTime != null) {
    if (annotation.index == selected) return 'orange'
    else return '#6fe200'
  } else {
    return 'red'
  }
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

function fillAnnotationPositions(annotation: Annotation) {
  if (!annotation.lastClickTimestamp) annotation.lastClickTimestamp = -1
  return annotation
}

function clearSelection() {
  selected = null
  //_.forEach(annotations, updateWord)
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
/*
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
*/
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


$('#reset').click(function (e) {
  recordMouseClick(e, '#reset')
  clear()
  location.reload()
})

// TODO Next must clear the loading flag whne it is done!
function submit(next: any) {
  if (loading != LoadingState.ready) return
  loading = LoadingState.submitting
  clear()
  message('warning', 'Submitting annotation')
  sendTelemetry()
  // TODO We should reenable this for mturk
  // tokenMode()
  const data = {
    segment: segment,
    token: token,
    browser: browser,
    width: canvas.width,
    height: canvas.height,
    words: words,
    selected: selected,
    start: startS,
    end: endS,
    startTime: startTime,
    startOffset: startOffset,
    lastClick: lastClick,
    worker: $.url().param().worker,
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
  }
  recordSend({
    data: data,
    server: $.url().attr().host,
    port: $.url().attr().port,
    why: 'submit',
  })
  $.ajax({
    type: 'POST',
    data: JSON.stringify(data),
    contentType: 'application/json',
    url: '/submission',
    success: function (data) {
      recordReceive({
        response: data,
        error: null,
        status: '200',
        server: $.url().attr().host,
        port: $.url().attr().port,
        why: 'submit',
      })
      if (data && data.response == 'ok') {
        if (data.stoken != null && token != null) {
          next()
          message('success', 'Thanks!<br/>Enter the following two characters back into Amazon Turk: ' + data.stoken)
        } else {
          next()
          message('success', 'Submitted annotation')
        }
      } else {
        loading = LoadingState.ready
        message(
          'danger',
          'Failed to submit annotation!<br>Bad server reply!<br/>Please email <a href="mailto:abarbu@csail.mit.edu">abarbu@csail.mit.edu</a> with this message. Your work will not be lost and we will give you credit for it.<br/>' +
            JSON.stringify([data, annotations])
        )
      }
    },
    error: function (data, status, error) {
      recordReceive({
        response: data,
        error: error,
        status: status,
        server: $.url().attr().host,
        port: $.url().attr().port,
        why: 'submit',
      })
      loading = LoadingState.ready
      message(
        'danger',
        'Failed to submit annotation!<br>Ajax error communicating with the server!<br/>Please email <a href="mailto:abarbu@csail.mit.edu">abarbu@csail.mit.edu</a> with this message. Your work will not be lost and we will give you credit for it.<br/>' +
          JSON.stringify([data, status, error, annotations])
      )
    },
  })
}

$('#submit').click(e => {
  recordMouseClick(e, '#submit')
  submit((a: any) => (loading = LoadingState.ready))
})


$('#edit-transcript').click(function (e) {
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
  recordMouseClick(e, '#edit-transcript', $('#transcript-input').val() + '')
  editingTranscriptMode = !editingTranscriptMode
})

$('#transcript-input').keypress(function (e) {
  recordMouseClick(e, '#transcript-input')
  if (e.which == 13) {
    e.preventDefault()
    $('#edit-transcript').click()
  }
})

$('#location-input').keypress(function (e) {
  recordMouseClick(e, '#location-input')
  if (e.which == 13) {
    e.preventDefault()
    $('#go-to-location').click()
  }
})

$('#go-to-location').click(function (e) {
  recordMouseClick(e, '#go-to-location')
  const val = String($('#location-input').val())
  const n = parseInt(val)
  if ('' + n !== $('#location-input').val()) {
    message('danger', "Go to location isn't an integer")
  } else {
    const s = mkSegmentName(movieName, parseInt(val), parseInt(val) + (endS - startS))
    $.get('/cuts/' + movieName + '/' + s + '.jpg', () => {
      reload(mkSegmentName(movieName, parseInt(val), parseInt(val) + (endS - startS)))
    }).fail(() => {
      message('danger', "That goto location doesn't exist in this movie")
    })
  }
})

$('#go-to-last').click(function (e) {
  recordMouseClick(e, '#go-to-last')
  $.get(
    '/last-annotation',
    {
      movieName: movieName,
      startS: startS,
      endS: endS,
      worker: $.url().param().worker,
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




function mkSegmentName(movieName: string, start: number, end: number) {
  return movieName + ':' + ('' + start) + ':' + ('' + end)
}

$('#back-save-2-sec').click(function (e) {
  recordMouseClick(e, '#back-save-2-sec')
  submit(() =>
    reload(movieName + ':' + ('' + (startS - 1)) + ':' + ('' + (endS - 1)))
  )
})

$('#forward-save-2-sec').click(function (e) {
  recordMouseClick(e, '#forward-save-2-sec')
  submit(() =>
    reload(movieName + ':' + ('' + (startS + 1)) + ':' + ('' + (endS + 1)))
  )
})

/*
($('.basicAutoComplete') as any).autoComplete({
    resolverSettings: {
        url: '/labels/places.json'
    }
})
*/

function preloadNextSegment(segment: string) {
  if (preloadSegments) {
    try {
      let s = parseSegment(segment)
      s.startTime += 2
      s.endTime += 2

      $.ajax({ url: '/cuts/' + movieName + '/' + segmentString(s) + '.jpg', method: 'GET' })
    } catch (err) {}
  }
}

function reload(segmentName: null | string) {
  try {
    if (loading == LoadingState.loading) return
    if (loading == LoadingState.submitting) {
      loading = LoadingState.loading
    }
    $('#words').empty()
    words = []
    $('#annotations').empty()
    $('#annotations').append(
      $('<button type="button" class="annotation btn btn-info">')
        .text('none')
        .data('worker', undefined)
        .click((e: JQuery.Event) => {
          recordMouseClick(e, '#annotation')
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

    $('#spectrogram').attr('src', '/cuts/' + movieName + '/' + segment + '.jpg')

    $('#location-input').val(startS)

    let labelList = {}
    $.ajax({'async': false, 'url': '/labels/ant-man_labels.json', 'dataType': "json", 'success': function(data) {labelList = data}, method: 'GET'})
    let start_string = startS.toString()
    var labels: string[] = []
    labels = labelList[start_string as keyof typeof labelList]
    for(var index in labels){
      var label = labels[index]
      $('#labeloptions > ul').append('<li><a href="#">' + label + '</a></li>')
    }

    let all_labelList = {}
    $.ajax({'async': false,
        'global': false,
        'url': '/labels/alllabels.json',
        'dataType': "json",
        'success': function (data) {all_labelList = data;}
      });

    const annotationParams = {
      movieName: movieName,
      // NB: We actually request more data than we need and filter it later. We
      // ask the server for words by their start time, not end time. Words that
      // start earlier but end in our segment would not show up if we didn't ask
      // for earlier start times. It's important to filter this properly,
      // because on submission the server will delete all annotations that end
      // in our segment. Any annotations missed here will be deleted prematurely
      // and any additional annotations incorrectly filtered out (that don't
      // overlap our segment) will be duplicated each time we submit.
      startS: startS - 4,
      endS: endS,
      workers: _.concat([$.url().param().worker], currentReferences()),
    }

    recordSend({
      data: annotationParams,
      server: $.url().attr().host,
      port: $.url().attr().port,
      why: 'reload',
    })

    $.when(
      $.get('/annotations', annotationParams)
    ).done((annotationReply_) => {
      const ass = annotationReply_[0].allAnnotations
      recordReceive({
        response: [ass],
        error: null,
        status: '200',
        server: $.url().attr().host,
        port: $.url().attr().port,
        why: 'reload',
      })
      preloadNextSegment(segment)
      function loadAnnotations(id: string) {
        if (_.isEmpty(words)) {
          words = _.map(other_annotations_by_worker[id], a => a.word)
          //updateWords(words)
        }
      }
      loadAnnotations($.url().param().worker)
      if (_.has(other_annotations_by_worker, $.url().param().defaultReference))
        loadAnnotations($.url().param().defaultReference)
      loading = LoadingState.ready
      message('success', 'Loaded ' + segment)
      if (_.isNull(guiRevision)) {
        guiRevision = annotationReply_[0].guiRevision
      } else if (guiRevision !== annotationReply_[0].guiRevision) {
        message('danger', 'A new version of the GUI exists, please reload your tab')
      }
    })
  } catch (err) {
    recordReceive({
      response: [],
      error: err,
      status: '',
      server: $.url().attr().host,
      port: $.url().attr().port,
      why: 'reload',
    })
    loading = LoadingState.ready
  }
}

if ($.url().param().noedit) {
  $('#edit-transcript').remove()
  $('#start-next-word').remove()
  $('#start-next-word-after-current-word').remove()
  $('#delete-selection').remove()
}

reload(null)
