import React, { useEffect, useRef, useState, useCallback, MutableRefObject } from 'react'
import * as Types from '../Types'
import { timeInSegmentToPercentInSegment, percentInSegmentToTimeInSegment } from '../components/Audio'
import _ from 'lodash'
import * as d3 from 'd3'

function percent(t: Types.PercentInSegment) {
    return 100 * Types.from(t) + '%'
}

function percentAdd(t: Types.PercentInSegment, offset: number) {
    return 100 * (Types.from(t) + offset) + '%'
}

function movieToPercent(t: Types.TimeInMovie, startTime: Types.TimeInMovie, buffer: AudioBuffer) {
    return percent(timeInSegmentToPercentInSegment(Types.timeInMovieToTimeInSegment(t, startTime), buffer))
}

function movieToPercent_(t: Types.TimeInMovie, startTime: Types.TimeInMovie, buffer: AudioBuffer) {
    return Types.from(timeInSegmentToPercentInSegment(Types.timeInMovieToTimeInSegment(t, startTime), buffer))
}

function colorOf(selected: boolean, color: string, colorSelected: string) {
    if (selected) {
        return colorSelected
    } else {
        return color
    }
}

function applyUpdateToAnnotation(
    decodedBuffer: AudioBuffer,
    prev: Types.Annotation,
    d: Types.DragPosition,
    p: Types.PercentInSegment
) {
    let next = _.clone(prev)
    const newStart = Types.addConst(next.startTime!, Types.from(percentInSegmentToTimeInSegment(p, decodedBuffer)))
    const newEnd = Types.addConst(next.endTime!, Types.from(percentInSegmentToTimeInSegment(p, decodedBuffer)))
    switch (d) {
        case Types.DragPosition.start:
            next.startTime = newStart
            break
        case Types.DragPosition.end:
            next.endTime = newEnd
            break
        case Types.DragPosition.both:
            next.startTime = newStart
            next.endTime = newEnd
            break
    }
    return next
}

function enableInteraction(
    editable: boolean,
    annotation: MutableRefObject<Types.Annotation>,
    startTime: MutableRefObject<Types.TimeInMovie>,
    ref: React.RefObject<SVGGraphicsElement>,
    enclosingRef: React.RefObject<SVGSVGElement>,
    direction: Types.DragPosition,
    annotationsRef: React.RefObject<Types.Annotation[]>,
    setRedraw: ({ }) => any,
    buffer: AudioBuffer,
    onSelect: (a: Types.Annotation, startTime: Types.TimeInMovie, end: number, position: Types.TimeInSegment) => any,
    onEndClicked: (a: Types.Annotation, startTime: Types.TimeInMovie, end: number, position: Types.TimeInSegment) => any,
    updateAnnotation: (a: Types.Annotation) => any,
    shouldRejectUpdate: (as: Types.Annotation[], next: Types.Annotation) => boolean
) {
    if (ref.current) {
        const e = d3.select(ref.current)
        e.call(
            // @ts-ignore
            d3
                .drag()
                .on('start', () => {
                    d3.event.sourceEvent.preventDefault()
                    onSelect(annotation.current,
                        startTime.current,
                        d3.event.x,
                        percentInSegmentToTimeInSegment(
                            Types.to<Types.PercentInSegment>(
                                d3.event.x / enclosingRef.current!.getBoundingClientRect().width
                            ),
                            buffer))
                })
                .on('end', () => {
                    d3.event.sourceEvent.preventDefault()
                    if (annotation.current !== annotationsRef.current![annotation.current.index]) {
                        updateAnnotation(annotation.current)
                    }
                    onEndClicked(annotation.current,
                        startTime.current,
                        d3.event.x,
                        percentInSegmentToTimeInSegment(
                            Types.to<Types.PercentInSegment>(
                                d3.event.x / enclosingRef.current!.getBoundingClientRect().width
                            ),
                            buffer))
                })
                .on('drag', () => {
                    if (editable) {
                        let next = applyUpdateToAnnotation(
                            buffer,
                            annotation.current,
                            direction,
                            Types.to<Types.PercentInSegment>(d3.event.dx / enclosingRef.current!.getBoundingClientRect().width)
                        )
                        if (
                            !_.isUndefined(next.endTime) &&
                            movieToPercent_(next.endTime, startTime.current, buffer) <= 0.001
                        )
                            return
                        if (
                            !_.isUndefined(next.startTime) &&
                            movieToPercent_(next.startTime, startTime.current, buffer) >= 0.999
                        )
                            return
                        if (shouldRejectUpdate(annotationsRef.current!, next)) {
                            return
                        } else {
                            annotation.current = next
                            setRedraw({})
                        }
                    }
                })
        )
    }
}

function clamp(p: Types.PercentInSegment): Types.PercentInSegment {
    return Types.to(_.clamp(Types.from(p), 0.001, 0.999))
}

function textAnchor(p: Types.PercentInSegment): 'start' | 'end' | 'middle' {
    if (Types.from(p) <= 0.008) {
        return 'start'
    } else if (Types.from(p) >= 0.992) {
        return 'end'
    } else return 'middle'
}

export default React.memo(function AnnotatedWord({
    editable,
    annotation,
    annotationsRef,
    enclosingRef,
    startTime,
    endTime,
    buffer,
    color = 'green',
    colorSelected = 'red',
    textHeight = '60%',
    midlineHeight = '50%',
    selected = false,
    onSelect = () => null,
    onEndClicked = () => null,
    updateAnnotation = () => null,
    shouldRejectUpdate = () => false,
}: {
    editable: boolean
    annotation: Types.Annotation
    annotationsRef: React.RefObject<Types.Annotation[]>
    startTime: Types.TimeInMovie
    endTime: Types.TimeInMovie
    enclosingRef: React.RefObject<SVGSVGElement>
    buffer: AudioBuffer
    color?: string
    colorSelected?: string
    textHeight?: string
    midlineHeight?: string
    selected: boolean
    onSelect?: (a: Types.Annotation, startTime: Types.TimeInMovie, location: number, position: Types.TimeInSegment) => any
    onEndClicked?: (a: Types.Annotation, startTime: Types.TimeInMovie, location: number, position: Types.TimeInSegment) => any
    updateAnnotation?: (a: Types.Annotation) => any
    shouldRejectUpdate?: (as: Types.Annotation[], next: Types.Annotation) => boolean
}) {
    const rectRef = useRef<SVGRectElement>(null)
    const handleLeftRef = useRef<SVGLineElement>(null)
    const handleRightRef = useRef<SVGLineElement>(null)
    const annotation_ = useRef<Types.Annotation>(annotation)
    const startTime_ = useRef<Types.TimeInMovie>(startTime)
    const [redraw_, setRedraw] = useState<{}>({})
    useEffect(() => {
        if (!_.isEqual(annotation_.current, annotation)) setRedraw({})
        annotation_.current = annotation
    }, [annotation])
    useEffect(() => {
        startTime_.current = startTime
    }, [startTime])
    const senseChangesRef = useCallback(node => {
        const fn = (ref: any, dp: any) =>
            enableInteraction(
                editable,
                annotation_,
                startTime_,
                ref,
                enclosingRef,
                dp,
                annotationsRef,
                setRedraw,
                buffer,
                onSelect,
                onEndClicked,
                updateAnnotation,
                shouldRejectUpdate
            )
        fn(rectRef, Types.DragPosition.both)
        fn(handleLeftRef, Types.DragPosition.start)
        fn(handleRightRef, Types.DragPosition.end)
    }, [])
    let a = annotation_.current
    return _.isUndefined(a.startTime) || _.isUndefined(a.endTime) ? (
        <g />
    ) : (
            <g className="annotated-word">
                <rect
                    x={movieToPercent(a.startTime, startTime, buffer)}
                    y={'0%'}
                    width={
                        100 *
                        Types.from(
                            Types.sub(
                                timeInSegmentToPercentInSegment(Types.timeInMovieToTimeInSegment(a.endTime, startTime), buffer),
                                timeInSegmentToPercentInSegment(Types.timeInMovieToTimeInSegment(a.startTime, startTime), buffer)
                            )
                        ) +
                        '%'
                    }
                    height={'100%'}
                    opacity={0.05}
                    stroke={colorOf(selected, color, colorSelected)}
                    fill={colorOf(selected, color, colorSelected)}
                />
                <line
                    x1={movieToPercent(a.startTime, startTime, buffer)}
                    x2={movieToPercent(a.endTime, startTime, buffer)}
                    y1={midlineHeight}
                    y2={midlineHeight}
                    strokeWidth={2}
                    strokeDasharray={'3, 3'}
                    opacity={0.7}
                    stroke={colorOf(selected, color, colorSelected)}
                />
                <line
                    x1={movieToPercent(a.startTime, startTime, buffer)}
                    x2={movieToPercent(a.startTime, startTime, buffer)}
                    y1={'0%'}
                    y2={'100%'}
                    strokeWidth={2}
                    opacity={0.7}
                    stroke={colorOf(selected, color, colorSelected)}
                />
                <line
                    x1={movieToPercent(a.endTime, startTime, buffer)}
                    x2={movieToPercent(a.endTime, startTime, buffer)}
                    y1={'0%'}
                    y2={'100%'}
                    strokeWidth={2}
                    opacity={0.7}
                    stroke={colorOf(selected, color, colorSelected)}
                />
                <text
                    style={{
                        filter: 'url(#blackOutlineEffect)',
                        fontFamily: 'sans-serif',
                        fontSize: '15px',
                        fill: colorOf(selected, color, colorSelected),
                        textAnchor: textAnchor(timeInSegmentToPercentInSegment(
                            Types.avg(
                                Types.timeInMovieToTimeInSegment(a.startTime, startTime),
                                Types.timeInMovieToTimeInSegment(a.endTime, startTime)
                            ),
                            buffer
                        )),
                        cursor: 'default',
                        userSelect: 'none',
                    }}
                    x={percent(
                        clamp(timeInSegmentToPercentInSegment(
                            Types.avg(
                                Types.timeInMovieToTimeInSegment(a.startTime, startTime),
                                Types.timeInMovieToTimeInSegment(a.endTime, startTime)
                            ),
                            buffer
                        ))
                    )}
                    y={textHeight}
                >
                    {a.word}
                </text>
                <rect
                    ref={rectRef}
                    x={movieToPercent(a.startTime, startTime, buffer)}
                    y={'0%'}
                    width={
                        100 *
                        Types.from(
                            Types.sub(
                                timeInSegmentToPercentInSegment(Types.timeInMovieToTimeInSegment(a.endTime, startTime), buffer),
                                timeInSegmentToPercentInSegment(Types.timeInMovieToTimeInSegment(a.startTime, startTime), buffer)
                            )
                        ) +
                        '%'
                    }
                    height={'100%'}
                    opacity={0}
                />
                <line
                    ref={handleLeftRef}
                    x1={movieToPercent(a.startTime, startTime, buffer)}
                    x2={movieToPercent(a.startTime, startTime, buffer)}
                    y1={'0%'}
                    y2={'100%'}
                    strokeWidth={10}
                    opacity={0}
                    stroke={'blue'}
                />
                <line
                    ref={handleRightRef}
                    x1={movieToPercent(a.endTime, startTime, buffer)}
                    x2={movieToPercent(a.endTime, startTime, buffer)}
                    y1={'0%'}
                    y2={'100%'}
                    strokeWidth={10}
                    opacity={0}
                    stroke={'blue'}
                />
                <g ref={senseChangesRef} />
            </g>
        )
})
