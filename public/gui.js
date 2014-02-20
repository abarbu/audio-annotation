// TODO No words inside other words
// TODO Have to serve up: the image, the audio, the words
// TODO Previous page for annotating words
// TODO Script to generate the spectrograms should remove useless high frequencies
// TODO split up audio into overlapping 5s chunks)
// TODO Metrics (cliks, locations, ?, words annotated)
// TODO submit should check for missing internal words
// TODO Directed word closing rather than 'end word'

// TODO Put speedup back
// TODO Unique ID generation
// TODO HIT Information in the submission, like ID number, etc

// TODO Tap should only play a small segment
// TODO Select on an open interval should play a small semgnet

// TODO Slow vs normal option

// TODO Every time you move a segment, play it

// TODO These will come from the server
var segment = "test"
var id = "test"
// TODO Fetched based on the segment
var words = ['who', 'wants', 'to', 'spend', 'Christmas', 'in', 'a', 'tropical', 'climate', 'anyway']

var contextClass = (window.AudioContext || 
                    window.webkitAudioContext || 
                    window.mozAudioContext || 
                    window.oAudioContext || 
                    window.msAudioContext)

if (contextClass) {
    var context = new contextClass()
} else {
    $("#loading").html('<h1><span class="label label-danger">Can\'t load audio context! Please use a recent free browser like the latest Chrome or Firefox.</span><h1>')
}

var buffer
var sourceNode
var javascriptNode
var canvas = $("#canvas")[0]
var ctx = canvas.getContext("2d")
var hot = chroma.scale(['black', 'red','yellow','white']).domain([0,300]).mode('rgb')
var startTime = 0
var startOffset = 0
var lastClick = 0
var svg = d3.select('#d3')
var selected = null
var annotations
var mute = false

function drag(annotation, position) {
    return d3.behavior.drag()
        .on("drag", function(d,i) {
            annotation[position] = d3.event.x
            updateWord(annotation)
        })
}


function setupAudioNodes() {
    javascriptNode = context.createScriptProcessor(256, 1, 1)
    javascriptNode.connect(context.destination)
}

function loadSound(url) {
    var request = new XMLHttpRequest()
    request.open('GET', url, true)
    request.responseType = 'arraybuffer'
    request.onload = function () {
        context.decodeAudioData(request.response, function (audioBuffer) {
            $("#loading").html('<h3><span class="label label-success">Audio loaded</span></h3>')
            buffer = audioBuffer
            setup(buffer)
            play(0)
        }, onError)
    }
    request.send()
}

function setup(buffer) {
    sourceNode = context.createBufferSource()
    sourceNode.connect(javascriptNode)
    sourceNode.buffer = buffer
    startTime = context.currentTime
    // disable audio for testing
    if(!mute) sourceNode.connect(context.destination)
    // Maybe?
    // sourceNode.playbackRate.value = 0.5
    // sourceNode.loop = true
}

function play(offset,duration) {
    console.log(offset)
    startTime = context.currentTime
    startOffset = offset
    if(duration != null)
        sourceNode.start(0,offset,duration)
    else
        sourceNode.start(0,offset)
}

function stop() {
    // Might need to do: player.sourceNode.noteOff(0) on some browsers?
    try { sourceNode.stop(0)
          startOffset = context.currentTime - startTime + startOffset
        } catch(err) {
            // Calling stop more than once should be safe, although
            // catching all errors is bad form
        }
}

function onError(e) {
    console.log(e)
}

function timeToPosition(time) { return ((time / sourceNode.buffer.duration) * canvas.width) }
function positionToTime(position) { return (position * sourceNode.buffer.duration / canvas.width) }

function redraw(timeOffset) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    var offset = timeToPosition(timeOffset)
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
    ctx.fillRect (offset, 1, 1, canvas.height)
    ctx.fillStyle = "rgba(200, 0, 0, 0.9)"
    ctx.fillRect (lastClick, 1, 2, canvas.height)
}

function mousePosition(canvas, event) {
    var rect = canvas.getBoundingClientRect()
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    }
}

function updateWords(words) {
    $('#words').empty()
    console.log(_.each)
    annotations = {}
    _.each(words, function(word, index) {
        annotations[index] = {}
        $('#words')
            .append($('<a href="#">').append($('<span class="word label label-info">')
                                                  .text(word)
                                                  .data('index',index)))
            .append(" ")})
    $(".word").click(function(e){
        e.preventDefault()
        if(annotations[$(this).data('index')]['start'] != null) {
            if(annotations[$(this).data('index')]['end'] != null) {
                selectWord(annotations[$(this).data('index')])
            } else {
                selectWord(endWord(lastClick))
            }
        }
        else {
            startWord($(this).data('index'), lastClick)
            clearSelection()
        }
    })
}

function startWord(index, position) {
    console.log([index, position])
    deleteWord(annotations[index])
    annotations[index] = {}
    annotations[index]['index'] = index
    annotations[index]['word'] = words[index]
    annotations[index]['start'] = position
    updateWord(annotations[index])
}

function endWord(position) {
    var word = _.sortBy(_.filter(annotations,
                                 function(annotation) { return annotation['start'] != null && annotation['start'] < position }),
                        function(annotation, index) {
                            console.log(position)
                            console.log(annotation)
                            return position - annotation['start']})[0]
    if(!word) return
    if(word['end'] != null) return // already ended
    word['end'] = position
    updateWord(word)
    return word
}

function annotationColor(annotation) {
    if(annotation['end'] != null) {
        if(annotation['index'] == selected)
            return 'orange'
        else
            return 'green'
    } else {
        return 'red'
    }
}

function clearWordLabels(annotation) {
    $('.word').eq(annotation['index'])
        .removeClass('label-success').removeClass('label-warning')
        .removeClass('label-info').removeClass('label-primary')
        .removeClass('label-danger')
}

function updateWord(annotation) {
    if(annotation['start'] != null) {
        clearWordLabels(annotation)
        if(annotation['end'] == null)
            $('.word').eq(annotation['index']).addClass('label-danger')
        else if(annotation['index'] == selected)
            $('.word').eq(annotation['index']).addClass('label-warning')
        else 
            $('.word').eq(annotation['index']).addClass('label-success')
        if(!annotation['text'])
            annotation['text'] = svg.append('text').text(annotation['word'])
        annotation['text']
            .attr("font-family", "sans-serif")
            .attr("font-size", "15px")
            .attr("class", "unselectable")
            .attr("fill", annotationColor(annotation))
            .on('click', function () {
                selectWord(annotation)
            })
        if(!annotation['start-line']) {
            annotation['start-line'] = svg
                .append('line').call(drag(annotation, 'start'))
                .on("click", function () { selectWord(annotation) })
        }
        annotation['start-line']
            .attr('x1', annotation['start'])
            .attr('x2', annotation['start'])
            .attr('y1','0')
            .attr('y2',$('#container').height())
            .attr('stroke', annotationColor(annotation))
            .attr('opacity', 0.7)
            .attr('stroke-width','4')
        if(annotation['end'] != null) {
            if(!annotation['end-line']) {
                annotation['end-line'] = svg
                    .append('line')
                    .call(drag(annotation, 'end'))
                    .on("click", function () { selectWord(annotation) })
            }
            annotation['end-line']
                .attr('x1', annotation['end'])
                .attr('x2', annotation['end'])
                .attr('y1','0')
                .attr('y2',$('#container').height())
                .attr('stroke', annotationColor(annotation))
                .attr('opacity', 0.7)
                .attr('stroke-width','4')
            if(!annotation['top-line'])
                annotation['top-line'] = svg.append('line')
            annotation['top-line']
                .attr('x1', annotation['start'])
                .attr('x2', annotation['end'])
                .attr('y1','566')
                .attr('y2','566')
                .attr('stroke', annotationColor(annotation))
                .attr('opacity', 0.7)
                .style("stroke-dasharray", ("3, 3"))
                .attr('stroke-width','4')
            annotation['text']
                .attr("x", (annotation['end'] - annotation['start']) / 2 + annotation['start'])
                .attr("y", "590")
                .attr("text-anchor", "middle")
        } else {
            annotation['text']
                .attr("x", annotation['start'] + 4)
                .attr("y", "590")
        }
    } else {
        $('.word').eq(annotation['index']).addClass('label-info')
    }
}

function deleteWord(annotation) {
    if(selected != null) {
        if(annotation['start'] != null) delete annotation['start']
        if(annotation['end'] != null) delete annotation['end']
        console.log(annotation['index'])
        console.log(annotation)
        if(annotation['index'] != null) {
            clearWordLabels(annotation)
            updateWord(annotation)
        }
        if(annotation['text']) annotation['text'].remove()
        if(annotation['start-line']) annotation['start-line'].remove()
        if(annotation['end-line']) annotation['end-line'].remove()
        if(annotation['top-line']) annotation['top-line'].remove()
        clearSelection()
    }
}

function clearSelection() {
        selected = null
        _.each(annotations, updateWord);
}

function selectWord(annotation) {
    if(annotation != null) {
        selected = annotation['index'];
        _.each(annotations, updateWord);
    }
}

$("#canvas").click(function(e){
    stop()
    setup(buffer)
    lastClick = mousePosition(canvas,e).x
    play(lastClick * sourceNode.buffer.duration / canvas.width, 1)
})

$("#play").click(function(e){
    stop();
    setup(buffer);
    play(0);})
$("#resume").click(function(e){
    setup(buffer);
    play(positionToTime(lastClick));})
$("#stop").click(function(e){stop();redraw(startOffset);})
$("#end-word").click(function(e){
    selectWord(endWord(lastClick))
})
$("#delete-selection").click(function(e){
    if(selected != null) deleteWord(annotations[selected]);})
$("#play-selection").click(function(e){
    if(selected != null) {
        stop();
        setup(buffer);
        annotation = annotations[selected];
        if(annotations[selected]['end'] != null)
            play(positionToTime(annotation['start']),
                 positionToTime(annotation['end']) - positionToTime(annotation['start']))
        else
            play(positionToTime(annotation['start']))
    }
})

$("#reset").click(function(e){location.reload();})
$("#submit").click(function(e){
    $.ajax({
        type: 'POST',
        data: JSON.stringify({segment: segment,
                              id: id,
                              width: canvas.width,
                              height: canvas.height,
                              words: words,
                              selected: selected,
                              startTime: startTime,
                              startOffset: startOffset,
                              lastClick: lastClick,
                              annotations:
                              _.map(annotations,
                                    function(a)
                                    { return {start: a.start,
                                              end: a.end,
                                              startTime: positionToTime(a.start),
                                              endTime: positionToTime(a.end),
                                              index: a.index,
                                              word: a.word }})}),
        contentType: 'application/json',
        url: '/submission',
        success: function( data ) {
            console.log('response')
            console.log(data)
        }
    })
})

$(document).bind('keydown', 'p', function() {$("#play").click()})
$(document).bind('keydown', 'r', function() {$("#resume").click()})
$(document).bind('keydown', 't', function() {$("#stop").click()})
$(document).bind('keydown', 'e', function() {$("#end-word").click()})
$(document).bind('keydown', 'd', function() {$("#delete-selection").click()})
$(document).bind('keydown', 's', function() {$("#play-selection").click()})

///

// $("#audio1").bootstrapSwitch();
// $("#audio1").on('click', function (e, data) { console.log("A"); stop(); mute = !mute; });

setupAudioNodes()
loadSound('/audio-clips/' + segment + '-0.5.wav')
$('#spectrogram').attr('src', 'spectrograms/' + segment + '.png')

javascriptNode.onaudioprocess = function (audioProcessingEvent) {
    if (sourceNode && sourceNode.playbackState == sourceNode.PLAYING_STATE) {
        if(startTime == -1) startTime = context.currentTime
        redraw(context.currentTime - startTime + startOffset)
    }
}

updateWords(words)
