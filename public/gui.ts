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

if (AudioContext) {
  context = new AudioContext()
} else {
  $('#loading').html(
    '<h1><span class="label label-danger">Can\'t load audio context! Please use a recent free browser like the latest Chrome or Firefox.</span><h1>'
  )
}

function setupAudioNodes() {
  javascriptNode = context!.createScriptProcessor(256, 1, 1)
  javascriptNode.connect(context!.destination)
}

setupAudioNodes()

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
function defaultPlayLength(): TimeInBuffer {
  switch (bufferKind) {
    case BufferType.half:
      return to(1.4)
    case BufferType.normal:
      return to(0.7)
  }
}

function verifyStartBeforeEnd(index: number, startTime: TimeInMovie) {
  if (annotations[index] && from(annotations[index].endTime!) - 0.01 <= from(startTime)) {
    message('warning', 'The start of word would be after the end')
    throw 'The start of word would be after the end'
  }
  return startTime
}

function verifyEndAfterStart(index: number, endTime: TimeInMovie) {
  if (annotations[index] && from(annotations[index].startTime!) + 0.01 >= from(endTime)) {
    message('warning', 'The end of word would be before the start')
    throw 'The end of word would be before the start'
  }
  return endTime
}

function verifyTranscriptOrder(index: number, time: TimeInMovie) {
  // Words that appear before this one the transcript should have earlier start times
  if (
    _.filter(
      annotations,
      a => isValidAnnotation(a) && from<TimeInMovie>(a.startTime!) > from<TimeInMovie>(time) && a.index < index
    ).length > 0
  ) {
    message('warning', 'This word would start before a word that is earlier in the transcript')
    throw 'This word would start before a word that is earlier in the transcript'
  }
  // Words that appear before this one the transcript should have earlier start times
  else if (
    _.filter(
      annotations,
      a => isValidAnnotation(a) && from<TimeInMovie>(a.startTime!) < from<TimeInMovie>(time) && a.index > index
    ).length > 0
  ) {
    message('warning', 'This word would start after a word that is later in the transcript')
    throw 'This word would start after a word that is later in the transcript'
  } else {
    return time
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
          annotation.startTime = verifyStartBeforeEnd(
            annotation.index,
            verifyTranscriptOrder(annotation.index, addConst(annotation.startTime!, from(positionToTime(to(dx)))))
          )
          break
        case DragPosition.end:
          annotation.endTime = verifyEndAfterStart(
            annotation.index,
            addConst(annotation.endTime!, from(positionToTime(to(dx))))
          )
          break
        case DragPosition.both:
          annotation.startTime = verifyTranscriptOrder(
            annotation.index,
            addConst(annotation.startTime!, from(positionToTime(to(dx))))
          )
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
    context!.decodeAudioData(
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
  sourceNode = context!.createBufferSource()
  sourceNode.connect(javascriptNode)
  sourceNode.buffer = buffer
  startTime = to<TimeInBuffer>(context!.currentTime)
  sourceNode.onended = () => {
    audioIsPlaying -= 1
    redraw()
  }
  if (!mute) sourceNode.connect(context!.destination)
  // Maybe?
  // sourceNode.playbackRate.value = 0.5
  // sourceNode.loop = true
}

function play(offset_: TimeInBuffer, duration_?: TimeInBuffer) {
  const offset = from(offset_)
  startTime = to<TimeInBuffer>(context!.currentTime)
  startOffset = offset_
  if (duration_ != null) {
    const duration = from(duration_)
    endTime = offset + duration
    audioIsPlaying += 1
    // Math.max is required for .start() because we have sgments that start before our audio does
    sourceNode.start(0, Math.max(0, offset), duration)
  } else {
    endTime = 1000000 // infinity seconds..
    audioIsPlaying += 1
    // Math.max is required for .start() because we have sgments that start before our audio does
    sourceNode.start(0, Math.max(0, offset))
  }
}

function stopPlaying() {
  // Might need to do: player.sourceNode.noteOff(0) on some browsers?
  try {
    sourceNode.stop(0)
    startOffset = to(context!.currentTime - from(add(startTime, startOffset)))
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

function wordClickHandler(index: number) {
  let annotation = annotations[index]
  if (annotation.startTime != null) {
    selectWord(annotation)
    $('#play-selection').click()
  } else {
    if (lastClick != null) {
      selectWord(startWord(index, lastClick))
      $('#play-selection').click()
    } else if (selected != null && annotations[selected].endTime != null) {
      selectWord(startWord(index, addConst(annotations[selected].endTime!, Math.max(0, index - selected - 1) * 0.1)))
      $('#play-selection').click()
    } else message('warning', 'Place the marker first by clicking on the image')
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
    const index = $(this).data('index')
    recordMouseClick(e, '.word', index + '')
    wordClickHandler(index)
  })
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
    const index = $(this).data('index')
    recordMouseClick(e, '.word', index + '')
    wordClickHandler(index)
  })
  _.forEach(annotations, updateWord)
}

function startWord(index: number, time: TimeInMovie) {
  if (
    !_.find(annotations, function (key) {
      return key.index != index && key.startTime == time
    })
  ) {
    verifyTranscriptOrder(index, time)
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
  return (e: any, j: any) => {
    recordMouseClick(e, '#click-on-word', [cloneAnnotation(annotation), isReference])
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
      if (!annotation.visuals.text)
        annotation.visuals.text = annotation.visuals.group.append('text').text(annotation.word)
      annotation.visuals.text
        .attr('filter', 'url(#blackOutlineEffect)')
        .attr('font-family', 'sans-serif')
        .attr('font-size', '15px')
        .attr('class', 'unselectable')
        .attr('fill', annotationColor(annotation, isReference))
        .on('click', handleClickOnAnnotatedWord(annotation, isReference))
      let textLocationTime = from(sub(annotation.endTime!, annotation.startTime!)) / 2 + from(annotation.startTime!)
      if (from(annotation.startTime) < startS) {
        textLocationTime = startS
        annotation.visuals.text.attr('text-anchor', 'start')
      } else if (from(annotation.endTime!) > endS) {
        textLocationTime = endS
        annotation.visuals.text.attr('text-anchor', 'end')
      } else {
        annotation.visuals.text.attr('text-anchor', 'middle')
      }
      annotation.visuals.text.attr('x', timeInMovieToPercent(to(textLocationTime))).attr('y', heightText(isReference))
    } else {
      $('.word').eq(annotation.index).addClass('label-danger')
    }
  }
}

function updateWord(annotation: Annotation) {
  updateWordBySource(annotation, false, $.url().param().worker)
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
  } else message('warnig', 'Click a word to select it first')
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

$('#play').click(function (e) {
  recordMouseClick(e, '#play')
  clear()
  stopPlaying()
  setup(buffers[bufferKind]!)
  play(to(0))
})
$('#stop').click(function (e) {
  recordMouseClick(e, '#stop')
  clear()
  stopPlaying()
  redraw(startOffset)
})
$('#delete-selection').click(function (e) {
  recordMouseClick(e, '#delete-selection', selected + '')
  clear()
  if (selected != null) {
    var index = annotations[selected].index
    deleteWord(annotations[selected])
    const previous = previousAnnotation(index)
    const next = nextAnnotation(index)
    if (previous != null) selectWord(annotations[previous])
    else if (next != null) selectWord(annotations[next])
    else message('warning', 'Click a word to select it first')
  } else message('warning', 'Click a word to select it first')
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

$('#play-selection').click(function (e) {
  recordMouseClick(e, '#play-selection', selected + '')
  clear()
  if (selected != null) {
    stopPlaying()
    setup(buffers[bufferKind]!)
    playAnnotation(annotations[selected])
  } else message('warning', 'Click a word to select it first')
})

$('#start-next-word').click(function (e) {
  clear()
  if (lastClick != null) {
    recordMouseClick(e, '#start-next-word', lastClick + '')
    const firstMissingWord = _.head(_.filter(annotations, a => !isValidAnnotation(a)))
    if (!firstMissingWord) {
      message('warning', "All words are already annotated; can't start another one")
      throw "All words are already annotated; can't start another one"
    } else {
      startWord(firstMissingWord.index, lastClick)
      selectWord(firstMissingWord)
    }
  } else {
    recordMouseClick(e, '#start-next-word', selected + '')
    if (
      selected != null &&
      annotations[selected].endTime != null &&
      (annotations[selected + 1] == null || annotations[selected + 1].endTime == null)
    ) {
      if (selected + 1 >= words.length) {
        message('warning', 'No next word to annotate')
        return
      }
      selectWord(startWord(selected + 1, annotations[selected].endTime!))
      $('#play-selection').click()
    } else {
      message('warning', 'Place the red marker or select a word to add another word after it')
      throw 'Place the red marker or select a word to add another word after it'
    }
  }
})

$('#start-next-word-after-current-word').click(function (e) {
  recordMouseClick(e, '#start-next-word-after-current-word', selected + '')
  clear()
  if (
    selected != null &&
    annotations[selected].endTime != null &&
    (annotations[selected + 1] == null || annotations[selected + 1].endTime == null)
  ) {
    if (selected + 1 >= words.length) {
      message('warning', 'No next word to annotate')
      return
    }
    selectWord(startWord(selected + 1, annotations[selected].endTime!))
    $('#play-selection').click()
  } else {
    message('warning', 'Select a word to add another word after it')
    throw 'Select a word to add another word after it'
  }
})

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

$('input[type="checkbox"],[type="radio"]').not('#create-switch').bootstrapSwitch()
$('#toggle-audio').on('switchChange.bootstrapSwitch', e => {
  stopPlaying()
  mute = !mute
  recordMouseClick(e, '#toggle-audio', mute + '')
})
$('#toggle-speed').on('switchChange.bootstrapSwitch', e => {
  stopPlaying()
  if (bufferKind == BufferType.half) bufferKind = BufferType.normal
  else if (bufferKind == BufferType.normal) bufferKind = BufferType.half
  recordMouseClick(e, '#toggle-speed', bufferKind + '')
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
    updateWordsWithAnnotations(_.filter(_.split(String($('#transcript-input').val()), ' '), a => a !== ''))
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
    $.get('/spectrograms/' + movieName + '/' + s + '.jpg', () => {
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

$('#replace-with-reference-annotation').click(function (e) {
  recordMouseClick(e, '#replace-with-reference-annotation')
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

$('#fill-with-reference').click(e => {
  recordMouseClick(e, '#fill-with-reference')
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
    message('success', 'Used reference to fill remanining annotations')
  } else {
    message('warning', 'No reference annotation exists')
  }
})

function mkSegmentName(movieName: string, start: number, end: number) {
  return movieName + ':' + ('' + start).padStart(5, '0') + ':' + ('' + end).padStart(5, '0')
}

$('#back-save-4-sec').click(function (e) {
  recordMouseClick(e, '#back-save-4-sec')
  submit(() =>
    reload(movieName + ':' + ('' + (startS - 4)).padStart(5, '0') + ':' + ('' + (endS - 4)).padStart(5, '0'))
  )
})

$('#back-save-2-sec').click(function (e) {
  recordMouseClick(e, '#back-save-2-sec')
  submit(() =>
    reload(movieName + ':' + ('' + (startS - 2)).padStart(5, '0') + ':' + ('' + (endS - 2)).padStart(5, '0'))
  )
})

$('#forward-save-2-sec').click(function (e) {
  recordMouseClick(e, '#forward-save-2-sec')
  submit(() =>
    reload(movieName + ':' + ('' + (startS + 2)).padStart(5, '0') + ':' + ('' + (endS + 2)).padStart(5, '0'))
  )
})

$('#forward-save-4-sec').click(function (e) {
  recordMouseClick(e, '#forward-save-4-sec')
  submit(() =>
    reload(movieName + ':' + ('' + (startS + 4)).padStart(5, '0') + ':' + ('' + (endS + 4)).padStart(5, '0'))
  )
})

javascriptNode!.onaudioprocess = function (_audioProcessingEvent) {
  if (sourceNode && audioIsPlaying) {
    if (from<TimeInBuffer>(startTime) == -1) startTime = to(context!.currentTime)
    redraw(to<TimeInBuffer>(context!.currentTime - from<TimeInBuffer>(startTime) + from<TimeInBuffer>(startOffset)))
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
  if (reference_annotations && worker != $.url().param().worker) {
    $('#annotations')
      .append(
        $('<button type="button" class="annotation btn btn-default">')
          .text(worker)
          .data('worker', worker)
          .click(e => {
            recordMouseClick(e, '#annotation', worker)
            render_other_annotations(worker)
          })
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
        $.ajax({ url: '/spectrograms/' + movieName + '/' + segmentString(s) + '.jpg', method: 'GET' })
    } catch (err) {}
  }
}

function reload(segmentName: null | string) {
  try {
    if (loading == LoadingState.loading) return
    if (loading == LoadingState.submitting) {
      loading = LoadingState.loading
    }
    stopPlaying()
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

    $('#spectrogram').attr('src', '/spectrograms/' + movieName + '/' + segment + '.jpg')

    message('warning', 'Loading audio ...')

    $('#location-input').val(startS)

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
      $.ajax({ url: '/audio-clips/' + movieName + '/' + segment + '.mp3', method: 'GET', dataType: 'arraybuffer' }),
      $.ajax({ url: '/audio-clips/' + movieName + '/' + segment + '-0.5.mp3', method: 'GET', dataType: 'arraybuffer' }),
      $.get('/annotations', annotationParams)
    ).done((clip_, clipHalf_, annotationReply_) => {
      const clip = clip_[0]
      const clipHalf = clipHalf_[0]
      const ass = annotationReply_[0].allAnnotations
      recordReceive({
        response: [clip_, clipHalf_, ass],
        error: null,
        status: '200',
        server: $.url().attr().host,
        port: $.url().attr().port,
        why: 'reload',
      })
      preloadNextSegment(segment)
      context!.decodeAudioData(
        clip,
        function (audioBuffer) {
          buffers['normal'] = audioBuffer
          setup(buffers['normal'])
          drawWaveform()
        },
        onError
      )
      context!.decodeAudioData(
        clipHalf,
        function (audioBuffer) {
          buffers['half'] = audioBuffer
          setup(buffers['half'])
        },
        onError
      )
      _.forEach(ass, as => {
        let l = _.map(as.annotations, fillAnnotationPositions)
        // NB The server returns extra words that are nearby; filter any that are too far out.
        // This is critical, see comment when this request was made.
        l = _.filter(l, a => !isValidAnnotation(a) || from(a.endTime!) > startS)
        other_annotations_by_worker[as.worker] = l
        register_other_annotations(as.worker)
      })
      function loadAnnotations(id: string) {
        if (_.isEmpty(words)) {
          words = _.map(other_annotations_by_worker[id], a => a.word)
          updateWords(words)
        }
        render_other_annotations(id)
      }
      loadAnnotations($.url().param().worker)
      $('#replace-with-reference-annotation').click()
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
