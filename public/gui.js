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

// http://localhost:3000/gui.html?segment=venom:05405:05410&id=1&notranscript=1

var viewer_width = 2240 // 1200
var viewer_height = 830 // 565
var viewer_border = 45

$('#canvas').attr('width', viewer_width).attr('height', viewer_height)
$('#d3').attr('width', viewer_width).attr('height', viewer_height + viewer_border)
$('#container').css('width', viewer_width).css('height', viewer_height + viewer_border)

var canvas = $("#canvas")[0]
var ctx = canvas.getContext("2d")

var contextClass = (window.AudioContext ||
                    window.webkitAudioContext ||
                    window.mozAudioContext ||
                    window.oAudioContext ||
                    window.msAudioContext)

var endTime = 100000; // infinity seconds..

if (contextClass) {
    var context = new contextClass()
} else {
    $("#loading").html('<h1><span class="label label-danger">Can\'t load audio context! Please use a recent free browser like the latest Chrome or Firefox.</span><h1>')
}

function setupAudioNodes() {
    javascriptNode = context.createScriptProcessor(256, 1, 1)
    javascriptNode.connect(context.destination)
}

setupAudioNodes()

function message(kind, msg) {
    $("#loading").html('<h4><div class="alert alert-' + kind + '">' + msg + '</span></h4>')
        .removeClass('invisible')
}

var parameters = $.url().param();

if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

var segment
var id
var transcriptNeeded
var bufferKind
// Fetched based on the segment
var remoteWords
var words
var mode
var token
var reason = 'annotated'
var browser = navigator.userAgent.toString()

// TODO Check all properties here
// TODO disable the default at some point
if(parameters.token) {
    token = parameters.token
    $.ajax({type: 'POST',
            data: JSON.stringify({token: parameters.token}),
            contentType: 'application/json',
            async: false,
            url: '/details',
            success: function(data) {
                if(data.response != 'ok') {
                    message('danger', 'Bad token!')
                    throw 'bad-token'
                }
                segment = data.segment
                id = data.id;}})
} else {
    if(parameters.segment)
        segment = parameters.segment
    else
        segment = "test"
    if(parameters.id)
        id = parameters.id
    else
        id = "test"
}

if(parameters.notranscript)
    transcriptNeeded = false
else
    transcriptNeeded = true

function keyboardShortcutsOn() {
    $(document).bind('keydown', 'p', function() {$("#play").click()})
    $(document).bind('keydown', 'r', function() {$("#resume").click()})
    $(document).bind('keydown', 't', function() {$("#stop").click()})
    $(document).bind('keydown', 'e', function() {$("#end-word").click()})
    $(document).bind('keydown', 'd', function() {$("#delete-selection").click()})
    $(document).bind('keydown', 's', function() {$("#play-selection").click()})
    $(document).bind('keydown', 'w', function() {$("#start-next-word").click()})
    $(document).bind('keydown', 'a', function() {$('#toggle-speed').bootstrapSwitch('toggleState')})
    $(document).bind('keydown', 'm', function() {$('#toggle-audio').bootstrapSwitch('toggleState')})
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
    if(sourceNode) {
        stop()
        play(0)}}

if(transcriptNeeded)
    transcriptionMode()
else
    annotationMode()

// delay between hearing a word, figuring out that it's the one
// you want, pressing the button and the event firing
var fixedButtonOffset = 0.05
function defaultPlayLength() {
    if(bufferKind == 'half') {
        return 1
    }
    if(bufferKind == 'normal') {
        return 0.5
    }
}

var buffers = {}
var sourceNode
var javascriptNode
var hot = chroma.scale(['black', 'red','yellow','white']).domain([0,300]).mode('rgb')
var startTime = 0
var startOffset = 0
var lastClick = null
var selected = null
var annotations
var mute = false
var minimumOffset = 8
var nextStop

var svg = d3.select('#d3')
svg.append('rect')
    .attr('width', $('#d3').attr('width'))
    .attr('height', $('#d3').attr('height'))
    .attr('fill', '#ffffff')
    .attr('fill-opacity', 0.0)
    .on("click", function(d, i) {
        $("#canvas").click();
    })
var svgAnnotations = svg.append('g')

function drag(annotation, position) {
    return d3.behavior.drag()
        .on("drag", function(d,i) {
            selectWord(annotation)
            var destination = d3.event.x
            if(position == 'start' && annotation.end != null) {
                destination = Math.min(annotation.end - minimumOffset, d3.event.x)
            }
            else if(position == 'end') {
                destination = Math.max(annotation.start + minimumOffset, d3.event.x)
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


function loadSound(url, kind, autoplay) {
    var request = new XMLHttpRequest()
    request.open('GET', url, true)
    request.responseType = 'arraybuffer'
    request.onload = function () {
        context.decodeAudioData(request.response, function (audioBuffer) {
            buffers[kind] = audioBuffer
            setup(buffers[kind])
            if(autoplay) {
                autoplay()
            }
        }, onError)
    }
    request.send()
}

function clear() { $("#loading").addClass('invisible') }

function setup(buffer) {
    sourceNode = context.createBufferSource()
    sourceNode.connect(javascriptNode)
    sourceNode.buffer = buffer
    startTime = context.currentTime
    sourceNode.onended = function () { redraw(null); }
    if(!mute) sourceNode.connect(context.destination)
    // Maybe?
    // sourceNode.playbackRate.value = 0.5
    // sourceNode.loop = true
}

function play(offset,duration) {
    startTime = context.currentTime
    startOffset = offset
    if(duration != null) {
        endTime = offset+duration;
        console.log(endTime);
        sourceNode.start(0,offset,duration)
    }
    else {
        endTime = 1000000; // infinity seconds..
        console.log(endTime);
        sourceNode.start(0,offset)
    }
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
    if(timeOffset < endTime) {
        var offset = timeToPosition(timeOffset)
        if(timeOffset != null) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
            ctx.fillRect (offset, 1, 1, canvas.height)
        }
    }
    if(lastClick != null) {
        ctx.fillStyle = "rgba(200, 0, 0, 0.9)"
        ctx.fillRect (lastClick, 1, 2, canvas.height)
    }
}

function mousePosition(canvas) {
    var rect = canvas.getBoundingClientRect()
    return {
        x: d3.event.clientX - rect.left,
        y: d3.event.clientY - rect.top
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
            if(annotation.start != null) {
                if(annotation.end != null) {
                    selectWord(annotation)
                    $("#play-selection").click()
                } else {
                    if(lastClick != null) {
                        selectWord(endWord(annotation, lastClick))
                        $("#play-selection").click()
                    } else {
                        message('danger', "Place the marker first by clicking on the image")
                    }
                }
            } else {
                if(lastClick != null) {
                    selectWord(startWord($(this).data('index'), lastClick))
                    $("#play-selection").click()
                } else if(selected != null && annotations[selected].end != null) {
                    selectWord(startWord($(this).data('index'), annotations[selected].end + 2))
                    $("#play-selection").click();
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
                               start: position,
                               end: Math.min(position + words[index].length*10,
                                             canvas.width) }
        updateWord(annotations[index])
        return annotations[index]
    } else
        message('danger', "Words can't start at the same position")
}

function closestWord(position) {
    return _.sortBy(_.filter(annotations,
                             function(annotation) { return annotation.start != null && annotation.start < position }),
                    function(annotation, index) {
                        console.log(position)
                        console.log(annotation)
                        return position - annotation.start})[0]
}

function endWord(word, position) {
    if(!word) {
        message('danger', "No word to end")
        return
    }
    if(word.end != null) {
        message('danger', "Words already ended")
        return
    }
    if(Math.abs(position - word.start) < 3) {
        throw message('danger', "The start and end of a word can't overlap")
    }
    word.end = position
    if(word.end < word.start) {
        var end = word.end
        var start = word.start
        word.start = end
        word.end = start
    }
    updateWord(word)
    return word
}

function annotationColor(annotation) {
    if(annotation.end != null) {
        if(annotation.index == selected)
            return 'orange'
        else
            return 'green'
    } else {
        return 'red'
    }
}

function clearWordLabels(annotation) {
    $('.word').eq(annotation.index)
        .removeClass('label-success').removeClass('label-warning')
        .removeClass('label-info').removeClass('label-primary')
        .removeClass('label-danger')
}

function updateWord(annotation) {
    if(annotation.start != null) {
        clearWordLabels(annotation)
        if(annotation.end == null)
            $('.word').eq(annotation.index).addClass('label-danger')
        else if(annotation.index == selected)
            $('.word').eq(annotation.index).addClass('label-warning')
        else
            $('.word').eq(annotation.index).addClass('label-success')
        if(!annotation.group) {
            annotation.group = svgAnnotations.append('g')
            annotation.group.datum(annotation.index)
        }
        if(!annotation.text)
            annotation.text = annotation.group.append('text').text(annotation.word)
        annotation.text
            .attr("font-family", "sans-serif")
            .attr("font-size", "15px")
            .attr("class", "unselectable")
            .attr("fill", annotationColor(annotation))
            .on('click', function () {
                clear()
                selectWord(annotation)
                $("#play-selection").click()
            })
        if(!annotation.startLine) {
            annotation.startLine = annotation.group.append('line')
            annotation.startLineHandle =
                annotation.group
                .append('line').call(drag(annotation, 'start'))
                .on("click", function () {
                    clear()
                    selectWord(annotation)
                    $("#play-selection").click()
                })
        }
        annotation.startLine
            .attr('x1', annotation.start)
            .attr('x2', annotation.start)
            .attr('y1','0')
            .attr('y2',$('#container').height())
            .attr('stroke', annotationColor(annotation))
            .attr('opacity', 0.7)
            .attr('stroke-width','2')
        annotation.startLineHandle
            .attr('x1', annotation.start+3)
            .attr('x2', annotation.start+3)
            .attr('y1','0')
            .attr('y2',$('#container').height())
            .attr('stroke', annotationColor(annotation))
            .attr('opacity', 0)
            .attr('stroke-width','10')
        if(annotation.end != null) {
            if(!annotation.filler) {
                annotation.filler = annotation.group
                    .insert('rect', ':first-child')
                    .on("click", function() {
                        clear()
                        selectWord(annotation)
                        $("#play-selection").click()
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
            if(!annotation.endLine) {
                annotation.endLine = annotation.group.append('line')
                annotation.endLineHandle =
                    annotation.group
                    .append('line')
                    .call(drag(annotation, 'end'))
                    .on("click", function () {
                        clear()
                        selectWord(annotation)
                        $("#play-selection").click()
                    })
            }
            annotation.endLine
                .attr('x1', annotation.end)
                .attr('x2', annotation.end)
                .attr('y1','0')
                .attr('y2',$('#container').height())
                .attr('stroke', annotationColor(annotation))
                .attr('opacity', 0.7)
                .attr('stroke-width','2')
            annotation.endLineHandle
                .attr('x1', annotation.end-3)
                .attr('x2', annotation.end-3)
                .attr('y1','0')
                .attr('y2',$('#container').height())
                .attr('stroke', annotationColor(annotation))
                .attr('opacity', 0)
                .attr('stroke-width','10')
            if(!annotation.topLine)
                annotation.topLine = annotation.group.append('line')
            annotation.topLine
                .attr('x1', annotation.start)
                .attr('x2', annotation.end)
                .attr('y1','566')
                .attr('y2','566')
                .attr('stroke', annotationColor(annotation))
                .attr('opacity', 0.7)
                .style("stroke-dasharray", ("3, 3"))
                .attr('stroke-width','2')
            annotation.text
                .attr("x", (annotation.end - annotation.start) / 2 + annotation.start)
                .attr("y", "590")
                .attr("text-anchor", "middle")
        } else {
            annotation.text
                .attr("x", annotation.start + 4)
                .attr("y", "590")
        }
    } else {
        $('.word').eq(annotation.index).addClass('label-info')
    }
}

function deleteWord(annotation) {
    if(selected != null) {
        if(annotation.start != null) delete annotation.start
        if(annotation.end != null) delete annotation.end
        if(annotation.index != null) {
            clearWordLabels(annotation)
            updateWord(annotation)
        }
        if(annotation.text) annotation.text.remove()
        if(annotation.startLine) {
            annotation.startLine.remove()
            annotation.startLineHandle.remove()
        }
        if(annotation.endLine) {
            annotation.endLine.remove()
            annotation.endLineHandle.remove()
        }
        if(annotation.filler) {
            annotation.filler.remove()
        }
        if(annotation.topLine) annotation.topLine.remove()
        clearSelection()
    } else
        message('danger', "Click a word to select it first")
}

function clearSelection() {
        selected = null
        _.each(annotations, updateWord);
}

function shuffleSelection() {
    svgAnnotations.selectAll('g').sort(function (a,b) {
        console.log([annotations[a].lastClickTimestamp, annotations[b].lastClickTimestamp])
        return d3.ascending(annotations[a].lastClickTimestamp, annotations[b].lastClickTimestamp)
    })
}

function selectWord(annotation) {
    if(annotation != null) {
        lastClick = null
        selected = annotation.index;
        annotation.lastClickTimestamp = Date.now();
        _.each(annotations, updateWord);
        shuffleSelection()
    }
}

function nextWord() {
    var word = _.filter(annotations,
                        function(annotation) {
                            return annotation.start == null
                        })[0]
    if(word)
        return word.index
    else
        return null
}

function nextAnnotation(index) {
    var word = _.filter(annotations,
                        function(annotation) {
                            return (annotation.index > index && annotation.start != null)
                        })[0]
    if(word)
        return word.index
    else
        return null
}

function previousAnnotation(index) {
    var word = _.filter(annotations,
                        function(annotation) {
                            return (annotation.index < index && annotation.start != null)
                        }).last()
    if(word)
        return word.index
    else
        return null
}

$("#canvas").click(function(e){
    clear()
    stop()
    setup(buffers[bufferKind])
    lastClick = mousePosition(canvas).x
    play(lastClick * sourceNode.buffer.duration / canvas.width, defaultPlayLength())
})

$("#play").click(function(e){
    clear()
    stop()
    setup(buffers[bufferKind])
    play(0);})
$("#play-transcript").click(function(e){$("#play").click()})
$("#resume").click(function(e){
    clear()
    if(lastClick != null) {
        setup(buffers[bufferKind]);
        play(positionToTime(lastClick));
    }})
$("#stop").click(function(e){clear();stop();redraw(startOffset);})
$("#delete-selection").click(function(e){
    clear()
    if(selected != null) {
        var index = annotations[selected].index
        deleteWord(annotations[selected])
        if(previousAnnotation(index) != null)
            selectWord(annotations[previousAnnotation(index)])
        else
            selectWord(annotations[nextAnnotation(index)])
    }
    else
        message('danger', "Click a word to select it first")})

$("#play-selection").click(function(e){
    clear()
    if(selected != null) {
        stop();
        setup(buffers[bufferKind]);
        annotation = annotations[selected];
        if(annotations[selected].end != null)
            play(positionToTime(annotation.start),
                 positionToTime(annotation.end) - positionToTime(annotation.start))
        else
            play(positionToTime(annotation.start), defaultPlayLength())
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
    if(selected != null &&
       annotations[selected].end != null &&
       (annotations[selected+1] == null || annotations[selected+1].end == null)) {
        if(selected + 1 >= words.length) {
            message('danger', 'No next word to annotate')
            return
        }
        selectWord(startWord(selected+1, annotations[selected].end+2))
        $("#play-selection").click();
    } else {
        var wordIndex = nextWord();
        if(wordIndex != null && position != null) {
            selectWord(startWord(wordIndex, position));
            $("#play-selection").click()
        } else {
            if(wordIndex == null)
                message('danger', "No next word to annotate")
            else
                message('danger', "Place the marker first by clicking on the image")
        }
    }
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
    tokenMode()
    $.ajax({
        type: 'POST',
        data: JSON.stringify({segment: segment,
                              id: id,
                              token: token,
                              browser: browser,
                              width: canvas.width,
                              height: canvas.height,
                              words: words,
                              remoteWords: remoteWords,
                              selected: selected,
                              startTime: startTime,
                              startOffset: startOffset,
                              lastClick: lastClick,
                              reason: reason,
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
                if(data.stoken != null && token != null) {
                    message('success', "Thanks!<br/>Enter the following two characters back into Amazon Turk: " + data.stoken)
                } else {
                    message('success', "Submitted annotation")
                }
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

$('input[type="checkbox"],[type="radio"]').not('#create-switch').bootstrapSwitch();
$("#toggle-audio").on('switchChange.bootstrapSwitch', function () { stop(); mute = !mute; });
$("#toggle-speed").on('switchChange.bootstrapSwitch', function () {
    stop();
    if(bufferKind == 'half')
        bufferKind = 'normal'
    else if(bufferKind == 'normal')
        bufferKind = 'half'
});

$('#provided-transcript').click(function(event) {
    words = remoteWords
    updateWords(words)
    annotationMode()
});

$('#new-transcript').click(function(event) {
    words = $('#transcript-box').val().split(' ')
    updateWords(words)
    annotationMode()
});

$('#no-speech').click(function(event) {
    var reason = 'no-speech'
    $("#submit").click();
});

$('#too-noisy').click(function(event) {
    var reason = 'too-noisy'
    $("#submit").click();
});

$('#cant-understand').click(function(event) {
    var reason = 'cant-understand'
    $("#submit").click();
});

$('#simultaneous-speakers').click(function(event) {
    var reason = 'simultaneous-speakers'
    $("#submit").click();
});

message('warning', 'Loading audio ...')

$.get('/words/' + segment + '.words', function(a) {
    remoteWords = a.split(' ')
    if(a === '') {
        $("#our-transcript").text('none').removeClass('invisible')
    } else {
        $("#our-transcript").text(remoteWords.join(' ')).removeClass('invisible')
    }
    words = remoteWords
    updateWords(words)
})

$('#spectrogram').attr('src', '/spectrograms/' + segment + '.jpg')
loadSound('/audio-clips/' + segment + '-0.5.wav', 'half',
          function () {
              message('success', 'Audio loaded')
          })
loadSound('/audio-clips/' + segment + '.wav', 'normal',
          function () {
              message('success', 'Audio loaded')
          })

javascriptNode.onaudioprocess = function (audioProcessingEvent) {
    if (sourceNode && sourceNode.playbackState == sourceNode.PLAYING_STATE) {
        if(startTime == -1) startTime = context.currentTime
        redraw(context.currentTime - startTime + startOffset)
    }
}

// Intro.js

$('#container').addClass('bootstro')
    .attr('data-bootstro-title', "Task")
    .attr('data-bootstro-content', "You're going to annotate the beginning and end of each word on this diagram. It's a representation of the audio. Time moves rightward and words have vertical features to help you see where they start and end. To make the task easier we've made the diagram large, so you may have to scroll left and right.")
    .attr('data-bootstro-placement', "top")
    .attr('data-bootstro-width', '600px')
    .attr('data-bootstro-step', '0')

$('#play').addClass('bootstro')
    .attr('data-bootstro-title', "Play")
    .attr('data-bootstro-content', "You can play the entire audio clip with this button. By default the audio plays at half the speed to make annotation easier.")
    .attr('data-bootstro-placement', "bottom")
    .attr('data-bootstro-step', '1')

$('#spectrogram').addClass('bootstro')
    .attr('data-bootstro-title', "Selecting")
    .attr('data-bootstro-content', "Next you'll place the red marker on the diagram, a short audio segment will play.")
    .attr('data-bootstro-placement', "top")
    .attr('data-bootstro-step', '2')

$('#words').addClass('bootstro')
    .attr('data-bootstro-title', "Words")
    .attr('data-bootstro-content', "Now that the marker is positioned you can choose which word to start at that location. We'll try to guess how long the word is but you should adjust it.")
    .attr('data-bootstro-placement', "top")
    .attr('data-bootstro-step', '3')

$('#play-selection').addClass('bootstro')
    .attr('data-bootstro-title', "Verifying")
    .attr('data-bootstro-content', "You should then adjust the word boundaries by dragging them into the correct position on the diagram. The audio will automatically play. You can replay by clicking here or by using the keyboard shortcuts in red.")
    .attr('data-bootstro-placement', "top")
    .attr('data-bootstro-step', '4')

$('#submit').addClass('bootstro')
    .attr('data-bootstro-title', "Submitting")
    .attr('data-bootstro-content', "Once you're done with all of the words you can click here and we'll give you the token to enter into Amazon interface. It's ok to leave out a word if you can't recognize it, it's too noisy, or if it's not actually there. Thanks for helping us with our research!")
    .attr('data-bootstro-placement', "bottom")
    .attr('data-bootstro-step', '5')

$("#intro").click(function(){bootstro.start(".bootstro", {finishButton: '<button class="btn btn-mini btn-warning bootstro-finish-btn"><i class="icon-ok"></i>Exit tutorial</button>'})})
