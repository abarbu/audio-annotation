
const telemetryEnabled: boolean = _.has($.url().param(), 'telemetry') ? $.url().param() === 'false' : true
let interactions: Interaction[] = [];

function sendTelemetry() {
    const is = interactions
    interactions = []
    if (_.isArray(is) && is.length > 0) {
        try {
            $.ajax({
                type: 'POST',
                data: {
                    interactions: is,
                    worker: $.url().param().worker,
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
                    date: new Date(),
                    annotations: _.map(annotations, cloneAnnotation)
                },
                dataType: 'application/json',
                url: $.url().attr('protocol') + '://' + $.url().attr('host') + ':' + (parseInt($.url().attr('port')) + 1) + '/telemetry'
            })
        } catch (err) {
            // We try our best to send back telemetry, but if it doesn't work, that's not an issue
        }
    }
}

if (telemetryEnabled)
    // every 30 seconds
    setInterval(sendTelemetry, 30000)

interface Interaction {
    kind: string
}

interface Message extends Interaction {
    level: string,
    data: string
}

interface Click extends Interaction {
    x: number,
    y: number,
    relativeX: number,
    relativeY: number,
    elements: any[]
}

interface DragStart extends Click {
}

interface DragEnd extends Click {
}

interface Resize extends Interaction {
    pagex: number,
    pagey: number,
}

interface Keypress extends Interaction {
    key: string,
    element?: string
}

interface Send extends Interaction {
    data: any,
    server: string,
    port: number,
    why: string
}

interface Receive extends Interaction {
    response: any,
    error: any,
    status: string,
    server: string
    port: number,
    why: string
}

function recordMessage(i: Omit<Message, 'kind'>) {
    const j: Message = {
        kind: 'message',
        ...i
    }
    interactions.push(j)
}

function recordSend(i: Omit<Send, 'kind'>) {
    const j: Send = {
        kind: 'send',
        ...i
    }
    interactions.push(j)
}

_.mixin({
    deeply:
        // @ts-ignore
        function(obj, fn) {
            if (_.isObjectLike(obj)) {
                return _.mapValues(_.mapValues(obj, fn), function(v) {
                    // @ts-ignore
                    return _.isPlainObject(v) || _.isArray(v) ? _.deeply(v, fn) : v;
                    // return _.isPlainObject(v) ? _.deeply(v, fn) : _.isArray(v) ? v.map(function(x) {
                    //     // @ts-ignore
                    //     return _.deeply(x, fn);
                    // }) : v;
                })
            } else {
                return fn(obj)
            }
        },
})

function recordReceive(i: Omit<Receive, 'kind'>) {
    // @ts-ignore
    i.response = _.deeply(i.response, function(val, key?) {
        if (_.isArray(val) || _.isString(val) || _.isNumber(val) || _.isDate(val)) {
            return val
        }
        if (_.isObjectLike(val)) {
            val = _.omit(val, _.functions(val))
            if (_.has(val, 'responseJSON')) {
                val = _.omit(val, ['responseText'])
            }
            return val
        }
        return null
    })
    const j: Receive = {
        kind: 'receive',
        ...i
    }
    interactions.push(j)
}

function recordKeypress(key: string, element?: string) {
    const j: Keypress = {
        kind: 'keypress',
        key: key,
        element: element
    }
    interactions.push(j)
}

function recordMouseClick(e: JQuery.Event, element: any, element2?: any) {
    const j: Click = {
        kind: 'mouse',
        elements: _.isUndefined(element2) ? [element] : [element, element2],
        // @ts-ignore
        relativeX: e.offsetX, // d3.event.layerX,
        // @ts-ignore
        relativeY: e.offsetY, // d3.event.layerY,
        // @ts-ignore
        x: e.pageX, // d3.event.x,
        // @ts-ignore
        y: e.pageY // d3.event.y
    }
    interactions.push(j)
}
