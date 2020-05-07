enum LoadingState {
    ready,
    submitting,
    loading
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
