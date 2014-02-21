// TODO No words inside other words
// TODO Have to serve up: the image, the audio, the words
// TODO Previous page for annotating words
// TODO Script to generate the spectrograms should remove useless high frequencies
// TODO split up audio into overlapping 5s chunks)
// TODO Metrics (cliks, locations, ?, words annotated)
// TODO submit should check for missing internal words
// TODO Unique ID generation
// TODO HIT Information in the submission, like ID number, etc
// TODO Slow vs normal option
// TODO check word order
// TODO Wider spectrograms
// TOOD Instructions

// TODO These will come from the server
var segment = "test"
var id = "test"
// TODO Fetched based on the segment
var words = ['who', 'wants', 'to', 'spend', 'Christmas', 'in', 'a', 'tropical', 'climate', 'anyway']

// delay between hearing a word, figuring out that it's the one
// you want, pressing the button and the event firing
var fixedButtonOffset = 0.05
var defaultPlayLength = 1

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
var lastClick = null
var svg = d3.select('#d3')
var selected = null
var annotations
var mute = true
var minimumOffset = 3

function drag(annotation, position) {
    return d3.behavior.drag()
        .on("drag", function(d,i) {
            selectWord(annotation)
            var destination = d3.event.x
            if(position == 'start' && annotation['end'] != null) {
                destination = Math.min(annotation['end'] - minimumOffset, d3.event.x)
            }
            else if(position == 'end') {
                destination = Math.max(annotation['start'] + minimumOffset, d3.event.x)
            } else {
                destination = d3.event.x
            }
            annotation[position] = destination
            updateWord(annotation)
        }).on("dragend", function(d,i) {
            selectWord(annotation)
            $("#play-selection").click();
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
            message('success', 'Audio loaded')
            buffer = audioBuffer
            setup(buffer)
            play(0)
        }, onError)
    }
    request.send()
}

function message(kind, msg) {
    $("#loading").html('<h4><div class="alert alert-' + kind + '">' + msg + '</span></h4>')
        .removeClass('invisible')
}

function clear() { $("#loading").addClass('invisible') }

function setup(buffer) {
    sourceNode = context.createBufferSource()
    sourceNode.connect(javascriptNode)
    sourceNode.buffer = buffer
    startTime = context.currentTime
    sourceNode.onended = function () { redraw(null) }
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
    redraw(null)
}

function onError(e) {
    console.log(e)
}

function timeToPosition(time) { return ((time / sourceNode.buffer.duration) * canvas.width) }
function positionToTime(position) { return (position * sourceNode.buffer.duration / canvas.width) }

function redraw(timeOffset) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    var offset = timeToPosition(timeOffset)
    if(timeOffset != null) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        ctx.fillRect (offset, 1, 1, canvas.height)
    }
    if(lastClick != null) {
        ctx.fillStyle = "rgba(200, 0, 0, 0.9)"
        ctx.fillRect (lastClick, 1, 2, canvas.height)
    }
}

function mousePosition(canvas) {
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
        annotations[index] = { index: index }
        $('#words')
            .append($('<a href="#">').append($('<span class="word label label-info">')
                                             .text(word)
                                             .data('index',index)))
            .append(" ")})
        $(".word").click(function(e){
            clear()
            e.preventDefault()
            var annotation = annotations[$(this).data('index')]
            if(annotation['start'] != null) {
                if(annotation['end'] != null) {
                    selectWord(annotation)
                    $("#play-selection").click()
                } else {
                    if(lastClick != null) {
                        selectWord(endWord(annotation, lastClick))
                        $("#play-selection").click()
                    } else
                        message('danger', "Place the marker first by clicking on the image")
                }
            } else {
                if(lastClick != null) {
                    selectWord(startWord($(this).data('index'), lastClick))
                    $("#play-selection").click()
                } else
                    message('danger', "Place the marker first by clicking on the image")
            }
        })
}

function startWord(index, position) {
    console.log([index, position])
    if(!_.find(annotations, function(key) { return key.index != index && key.start == position })) {
        deleteWord(annotations[index])
        annotations[index] = { index: index,
                               word: words[index],
                               start: position }
        updateWord(annotations[index])
        return annotations[index]
    } else
        message('danger', "Words can't start at the same position")
}

function closestWord(position) {
    return _.sortBy(_.filter(annotations,
                             function(annotation) { return annotation['start'] != null && annotation['start'] < position }),
                    function(annotation, index) {
                        console.log(position)
                        console.log(annotation)
                        return position - annotation['start']})[0]
}

function endWord(word, position) {
    if(!word) {
        message('danger', "No word to end")
        return
    }
    if(word['end'] != null) {
        message('danger', "Words already ended")
        return
    }
    if(Math.abs(position - word['start']) < 3) {
        throw message('danger', "The start and end of a word can't overlap")
    }
    word['end'] = position
    if(word['end'] < word['start']) {
        var end = word['end']
        var start = word['start']
        word['start'] = end
        word['end'] = start
    }
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
                clear()
                selectWord(annotation)
                $("#play-selection").click()
            })
        if(!annotation['start-line']) {
            annotation['start-line'] = svg.append('line')
            annotation['start-line-handle'] = svg
                .append('line').call(drag(annotation, 'start'))
                .on("click", function () {
                    clear()
                    selectWord(annotation)
                    $("#play-selection").click()
                })
        }
        annotation['start-line']
            .attr('x1', annotation['start'])
            .attr('x2', annotation['start'])
            .attr('y1','0')
            .attr('y2',$('#container').height())
            .attr('stroke', annotationColor(annotation))
            .attr('opacity', 0.7)
            .attr('stroke-width','2')
        annotation['start-line-handle']
            .attr('x1', annotation['start'])
            .attr('x2', annotation['start'])
            .attr('y1','0')
            .attr('y2',$('#container').height())
            .attr('stroke', annotationColor(annotation))
            .attr('opacity', 0.1)
            .attr('stroke-width','8')
        if(annotation['end'] != null) {
            if(!annotation['end-line']) {
                annotation['end-line'] = svg.append('line')
                annotation['end-line-handle'] = svg
                    .append('line')
                    .call(drag(annotation, 'end'))
                    .on("click", function () {
                        clear()
                        selectWord(annotation)
                        $("#play-selection").click()
                    })
            }
            annotation['end-line']
                .attr('x1', annotation['end'])
                .attr('x2', annotation['end'])
                .attr('y1','0')
                .attr('y2',$('#container').height())
                .attr('stroke', annotationColor(annotation))
                .attr('opacity', 0.7)
                .attr('stroke-width','2')
            annotation['end-line-handle']
                .attr('x1', annotation['end'])
                .attr('x2', annotation['end'])
                .attr('y1','0')
                .attr('y2',$('#container').height())
                .attr('stroke', annotationColor(annotation))
                .attr('opacity', 0.1)
                .attr('stroke-width','8')
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
                .attr('stroke-width','2')
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
        if(annotation['start-line']) {
            annotation['start-line'].remove()
            annotation['start-line-handle'].remove()
        }
        if(annotation['end-line']) annotation['end-line'].remove()
        if(annotation['top-line']) annotation['top-line'].remove()
        clearSelection()
    } else
        message('danger', "Click a word to select it first")
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

function nextWord() {
    var word = _.filter(annotations,
                        function(annotation) {
                            return annotation['start'] == null
                        })[0]
    if(word)
        return word.index
    else
        return null
}

$("#canvas").click(function(e){
    clear()
    stop()
    setup(buffer)
    lastClick = mousePosition(canvas).x
    play(lastClick * sourceNode.buffer.duration / canvas.width, defaultPlayLength)
})

$("#play").click(function(e){
    clear()
    stop()
    setup(buffer)
    play(0);})
$("#resume").click(function(e){
    clear()
    if(lastClick != null) {
        setup(buffer);
        play(positionToTime(lastClick));
    }})
$("#stop").click(function(e){clear();stop();redraw(startOffset);})
$("#delete-selection").click(function(e){
    clear()
    if(selected != null)
        deleteWord(annotations[selected])
    else
        message('danger', "Click a word to select it first")})

$("#play-selection").click(function(e){
    clear()
    if(selected != null) {
        stop();
        setup(buffer);
        annotation = annotations[selected];
        if(annotations[selected]['end'] != null)
            play(positionToTime(annotation['start']),
                 positionToTime(annotation['end']) - positionToTime(annotation['start']))
        else
            play(positionToTime(annotation['start']), defaultPlayLength)
    } else
        message('danger', "Click a word to select it first")
})

$("#start-next-word").click(function(e){
    clear()
    var position = null;
    if(sourceNode.playbackState == sourceNode.PLAYING_STATE)
        position = timeToPosition(Math.max(0, context.currentTime - startTime + startOffset - fixedButtonOffset));
    else if(lastClick != null) {
        position = lastClick
    }
    var word = nextWord();
    if(word != null && position != null) {
        selectWord(startWord(word, position));
        $("#play-selection").click()
    } else
        message('danger', "Place the marker first by clicking on the image")
})

$("#end-word").click(function(e){
    clear()
    var position = null;
    if(sourceNode.playbackState == sourceNode.PLAYING_STATE)
        position = timeToPosition(Math.max(0, context.currentTime - startTime + startOffset - fixedButtonOffset));
    else if(lastClick != null) {
        position = lastClick
    }
    if(position != null) {
        var word = endWord(closestWord(position), position)
        if(word) {
            selectWord(word)
            $("#play-selection").click()
        } else {
            message('danger', "No word to end")
        }
    } else
        message('danger', "Place the marker first by clicking on the image")
})

$("#reset").click(function(e){ clear(); location.reload();})
$("#submit").click(function(e){
    clear()
    message('warning', "Submitting annotation")
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
            console.log(data)
            if(data && data.response == 'ok') {
                message('success', "Submitted annotation")
            } else {
                message('danger',
                        "Failed to submit annotation!<br>Bad server reply!<br/>Please email <a href=\"mailto:abarbu@csail.mit.edu\">abarbu@csail.mit.edu</a> with this message. Your work will not be lost, and we get credit for it, if you do so.<br/>"
                        + JSON.stringify([data, annotations]))
            }
        },
        error: function( data, status, error ) {
            message('danger',
                    "Failed to submit annotation!<br>Ajax error communicating with the server!<br/>Please email <a href=\"mailto:abarbu@csail.mit.edu\">abarbu@csail.mit.edu</a> with this message. Your work will not be lost, and we get credit for it, if you do so.<br/>"
                    + JSON.stringify([data, status, error, annotations]))
        }
    })
})

$(document).bind('keydown', 'p', function() {$("#play").click()})
$(document).bind('keydown', 'r', function() {$("#resume").click()})
$(document).bind('keydown', 't', function() {$("#stop").click()})
$(document).bind('keydown', 'e', function() {$("#end-word").click()})
$(document).bind('keydown', 'd', function() {$("#delete-selection").click()})
$(document).bind('keydown', 's', function() {$("#play-selection").click()})
$(document).bind('keydown', 'w', function() {$("#start-next-word").click()});

svg.append('rect')
    .attr('width', $('#d3').width())
    .attr('height', $('#d3').height())
    .attr('fill', '#ffffff')
    .attr('fill-opacity', 0.0)
    .on("click", function(d, i) {
        $("#canvas").click();
    })

// $("#audio1").bootstrapSwitch();
// $("#audio1").on('click', function (e, data) { console.log("A"); stop(); mute = !mute; });

message('warning', 'Loading audio ...')

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
