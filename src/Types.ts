import _ from 'lodash'

export enum LoadingState {
    ready,
    submitting,
    loading,
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

export function timeInMovieToTimeInSegment(t: TimeInMovie, start: TimeInMovie): TimeInSegment {
    return to(from(sub(t, start)))
}

export function timeInSegmentToTimeInMovie(t: TimeInSegment, start: TimeInMovie): TimeInMovie {
    return to(from(t) + from(start))
}

export enum MessageLevel {
    info = 'info',
    success = 'success',
    warning = 'warning',
    error = 'error',
    closed = 'closed',
}

export function verifyStartBeforeEnd(
    annotations: Annotation[],
    message: (lvl: MessageLevel, msg: string) => any,
    index: number,
    startTime: TimeInMovie
) {
    if (annotations[index] && from(annotations[index].endTime!) - 0.01 <= from(startTime)) {
        message(MessageLevel.warning, 'The start of word would be after the end')
        throw 'The start of word would be after the end'
    }
    return startTime
}

export function verifyEndAfterStart(
    annotations: Annotation[],
    message: (lvl: MessageLevel, msg: string) => any,
    index: number,
    endTime: TimeInMovie
) {
    if (annotations[index] && from(annotations[index].startTime!) + 0.01 >= from(endTime)) {
        message(MessageLevel.warning, 'The end of word would be before the start')
        throw 'The end of word would be before the start'
    }
    return endTime
}

export function verifyTranscriptOrder(
    oldAnnotations: Annotation[],
    newAnnotations: Annotation[],
    message: (lvl: MessageLevel, msg: string) => any,
    index: number,
    time: TimeInMovie
) {
    // Words that appear before this one the transcript should have earlier start times
    if (
        _.filter(
            newAnnotations,
            a => isValidAnnotation(a) && (from<TimeInMovie>(a.startTime!) > from<TimeInMovie>(time) && a.index < index)
        ).length > 0
    ) {
        message(MessageLevel.warning, 'This word would start before a word that is earlier in the transcript')
        return oldAnnotations
    }
    // Words that appear before this one the transcript should have earlier start times
    else if (
        _.filter(
            newAnnotations,
            a => isValidAnnotation(a) && (from<TimeInMovie>(a.startTime!) < from<TimeInMovie>(time) && a.index > index)
        ).length > 0
    ) {
        message(MessageLevel.warning, 'This word would start after a word that is later in the transcript')
        return oldAnnotations
    } else {
        return newAnnotations
    }
}
