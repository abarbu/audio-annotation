import _ from 'lodash'

export enum LoadingState {
    ready,
    submitting,
    loading
}

// https://www.everythingfrontend.com/posts/newtype-in-typescript.html
export type TimeInSegment = { value: number; readonly __tag: unique symbol }
export type TimeInMovie = { value: number; readonly __tag: unique symbol }
export type PlayerPosition = { value: number; readonly __tag: unique symbol }
export type PercentInSegment = { value: number; readonly __tag: unique symbol }

export function avg<T extends { readonly __tag: symbol; value: number }>(t1: T, t2: T): T {
    return lift2<T>(t1, t2, (a, b) => (a + b) / 2)
}

export function add<T extends { readonly __tag: symbol; value: number }>(t1: T, t2: T): T {
    return lift2<T>(t1, t2, (a, b) => a + b)
}

export function sub<T extends { readonly __tag: symbol; value: number }>(t1: T, t2: T): T {
    return lift2<T>(t1, t2, (a, b) => a - b)
}

export function addConst<T extends { readonly __tag: symbol; value: number }>(t: T, c: number): T {
    return lift<T>(t, a => a + c)
}

export function subConst<T extends { readonly __tag: symbol; value: number }>(t: T, c: number): T {
    return lift<T>(t, a => a - c)
}

export function addMin<T extends { readonly __tag: symbol; value: number }>(t1: T, t2: T, t3: T): T {
    return lift3<T>(t1, t2, t3, (a, b, c) => Math.min(a + b, c))
}

export function subMax<T extends { readonly __tag: symbol; value: number }>(t1: T, t2: T, t3: T): T {
    return lift3<T>(t1, t2, t3, (a, b, c) => Math.max(a - b, c))
}

export function to<T extends { readonly __tag: symbol; value: any } = { readonly __tag: unique symbol; value: never }>(
    value: T['value']
): T {
    return (value as any) as T
}

export function from<T extends { readonly __tag: symbol; value: any }>(value: T): T['value'] {
    return (value as any) as T['value']
}

export function lift<T extends { readonly __tag: symbol; value: any }>(
    value: T,
    callback: (value: T['value']) => T['value']
): T {
    return callback(value)
}

export function lift2<T extends { readonly __tag: symbol; value: any }>(
    x: T,
    y: T,
    callback: (x: T['value'], y: T['value']) => T['value']
): T {
    return callback(x, y)
}

export function lift3<T extends { readonly __tag: symbol; value: any }>(
    x: T,
    y: T,
    z: T,
    callback: (x: T['value'], y: T['value'], z: T['value']) => T['value']
): T {
    return callback(x, y, z)
}

export interface Annotation {
    word: string
    index: number
    startTime?: TimeInMovie
    endTime?: TimeInMovie
    lastClickTimestamp?: number
    id?: string | number
    visuals?: Visuals
}

export interface Visuals {
    group: SVGElement
    text: SVGElement
    startLine: SVGElement
    startLineHandle: SVGElement
    endLine: SVGElement
    endLineHandle: SVGElement
    filler: SVGElement
    topLine: SVGElement
}

export enum DragPosition {
    start = 'startTime',
    end = 'endTime',
    both = 'both',
}

// This clones without the UI elements
export function cloneAnnotation(a: Annotation): Annotation {
    return {
        startTime: a.startTime,
        endTime: a.endTime,
        lastClickTimestamp: a.lastClickTimestamp,
        word: a.word,
        index: a.index,
    }
}

export function isValidAnnotation(a: Annotation) {
    return (
        _.has(a, 'startTime') &&
        !_.isUndefined(a.startTime) &&
        !_.isNull(a.startTime) &&
        _.has(a, 'endTime') &&
        !_.isUndefined(a.endTime) &&
        !_.isNull(a.endTime)
    )
}

export interface DragFunctions {
    onDrag: (x: number) => any
    onDragStart: (x: number) => any
    onDragEnd: (x: number) => any
    onClear: () => any
}

// function timeInMovieToPercent(time: TimeInMovie): string {
//     return 100 * ((from(time) - startS) / (endS - startS)) + '%'
// }
// function timeInMovieToTimeInBuffer(time: TimeInMovie): TimeInBuffer {
//     return positionToTimeInBuffer(absoluteTimeToPosition(time))
// }
// function absoluteTimeToPosition(time: TimeInMovie): PositionInSpectrogram {
//     return to(((from(time) - startS) / (endS - startS)) * canvas.width)
// }
// function timeToPosition(time: TimeInSegment): PositionInSpectrogram {
//     return to((from(time) / (endS - startS)) * canvas.width)
// }
// function timeInBufferToPosition(time: TimeInBuffer): PositionInSpectrogram {
//     return to((from(time) / sourceNode.buffer!.duration) * canvas.width)
// }
// function timeInMovieToPosition(time: TimeInMovie): PositionInSpectrogram {
//     return to(((from(time) - startS) / (endS - startS)) * canvas.width)
// }
// function positionToTime(position: PositionInSpectrogram): TimeInSegment {
//     return to((from(position) * (endS - startS)) / canvas.width)
// }
// function positionToTimeInBuffer(position: PositionInSpectrogram): TimeInBuffer {
//     return to((from(position) * sourceNode.buffer!.duration) / canvas.width)
// }
// function positionToAbsoluteTime(position: PositionInSpectrogram): TimeInMovie {
//     return to(startS + (from(position) * (endS - startS)) / canvas.width)
// }


export function timeInMovieToTimeInSegment(t: TimeInMovie, start: TimeInMovie): TimeInSegment {
    return to(from(sub(t, start)))
}

export function timeInSegmentToTimeInMovie(t: TimeInSegment, start: TimeInMovie): TimeInMovie {
    return to(from(t) - from(start))
}
