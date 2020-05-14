import React, { useEffect, useRef, useState, MutableRefObject } from 'react'
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

function colorOf(selected: boolean, color: string, colorSelected: string) {
    if (selected) {
        return colorSelected
    } else {
        return color
    }
}

function enableInteraction(annotation: MutableRefObject<Types.Annotation>,
    startTime: MutableRefObject<Types.TimeInMovie>,
    ref: React.RefObject<SVGGraphicsElement>,
    enclosingRef: React.RefObject<SVGSVGElement>,
    direction: Types.DragPosition,
    onSelect: ((a: Types.Annotation, startTime: Types.TimeInMovie) => any),
    onEndClicked: ((a: Types.Annotation, startTime: Types.TimeInMovie) => any),
    updateAnnotation: ((a: Types.Annotation, position: Types.DragPosition, dx: Types.PercentInSegment, startTime: Types.TimeInMovie) => any)) {
    if (ref.current) {
        const e = d3.select(ref.current)
        e.call(
            // @ts-ignore
            d3.drag()
                .on('start', e => {
                    d3.event.sourceEvent.preventDefault()
                    onSelect(annotation.current, startTime.current)
                })
                .on('end', () => {
                    d3.event.sourceEvent.preventDefault();
                    onEndClicked(annotation.current, startTime.current)
                })
                .on('drag', () => {
                    updateAnnotation(annotation.current,
                        direction,
                        Types.to<Types.PercentInSegment>(d3.event.dx / enclosingRef.current!.getBoundingClientRect().width),
                        startTime.current)
                })
        )
    }
}

export default React.memo(function AnnotatedWord({
    annotation,
    enclosingRef,
    startTime,
    buffer,
    color = 'green',
    colorSelected = 'red',
    textHeight = '60%',
    midlineHeight = '50%',
    selected = false,
    onSelect = () => null,
    onEndClicked = () => null,
    updateAnnotation = () => null,
}: {
    annotation: Types.Annotation
    startTime: Types.TimeInMovie
    enclosingRef: React.RefObject<SVGSVGElement>
    buffer: AudioBuffer
    color?: string
    colorSelected?: string
    textHeight?: string
    midlineHeight?: string
    selected: boolean
    onSelect?: ((a: Types.Annotation, startTime: Types.TimeInMovie) => any)
    onEndClicked?: ((a: Types.Annotation, startTime: Types.TimeInMovie) => any)
    updateAnnotation?: ((a: Types.Annotation, position: Types.DragPosition, dx: Types.PercentInSegment, startTime: Types.TimeInMovie) => any)
}) {
    const rectRef = useRef<SVGRectElement>(null)
    const handleLeftRef = useRef<SVGLineElement>(null)
    const handleRightRef = useRef<SVGLineElement>(null)
    const annotation_ = useRef<Types.Annotation>(annotation)
    const startTime_ = useRef<Types.TimeInMovie>(startTime)
    useEffect(() => { annotation_.current = annotation }, [annotation])
    useEffect(() => { startTime_.current = startTime }, [startTime])
    useEffect(() => {
        enableInteraction(annotation_, startTime_, rectRef, enclosingRef, Types.DragPosition.both, onSelect, onEndClicked, updateAnnotation)
        enableInteraction(annotation_, startTime_, handleLeftRef, enclosingRef, Types.DragPosition.start, onSelect, onEndClicked, updateAnnotation)
        enableInteraction(annotation_, startTime_, handleRightRef, enclosingRef, Types.DragPosition.end, onSelect, onEndClicked, updateAnnotation)
    }, [rectRef, handleLeftRef, handleRightRef])
    let a = annotation
    return (
        <g>
            <rect
                x={movieToPercent(a.startTime!, startTime, buffer)}
                y={'0%'}
                width={
                    100 *
                    Types.from(
                        Types.sub(
                            timeInSegmentToPercentInSegment(Types.timeInMovieToTimeInSegment(a.endTime!, startTime), buffer),
                            timeInSegmentToPercentInSegment(Types.timeInMovieToTimeInSegment(a.startTime!, startTime), buffer)
                        )
                    ) +
                    '%'
                }
                height={'100%'}
                opacity={0.1}
                stroke={colorOf(selected, color, colorSelected)}
                fill={colorOf(selected, color, colorSelected)}
            />
            <line
                x1={movieToPercent(a.startTime!, startTime, buffer)}
                x2={movieToPercent(a.endTime!, startTime, buffer)}
                y1={midlineHeight}
                y2={midlineHeight}
                strokeWidth={2}
                strokeDasharray={'3, 3'}
                opacity={0.7}
                stroke={colorOf(selected, color, colorSelected)}
            />
            <line
                x1={movieToPercent(a.startTime!, startTime, buffer)}
                x2={movieToPercent(a.startTime!, startTime, buffer)}
                y1={'0%'}
                y2={'100%'}
                strokeWidth={2}
                opacity={0.7}
                stroke={colorOf(selected, color, colorSelected)}
            />
            <line
                x1={movieToPercent(a.endTime!, startTime, buffer)}
                x2={movieToPercent(a.endTime!, startTime, buffer)}
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
                    textAnchor: 'middle',
                    cursor: 'default',
                    userSelect: 'none',
                }}
                x={percent(
                    timeInSegmentToPercentInSegment(
                        Types.avg(
                            Types.timeInMovieToTimeInSegment(a.startTime!, startTime),
                            Types.timeInMovieToTimeInSegment(a.endTime!, startTime)
                        ),
                        buffer
                    )
                )}
                y={textHeight}
            >
                {a.word}
            </text>
            <rect
                ref={rectRef}
                x={movieToPercent(a.startTime!, startTime, buffer)}
                y={'0%'}
                width={
                    100 *
                    Types.from(
                        Types.sub(
                            timeInSegmentToPercentInSegment(Types.timeInMovieToTimeInSegment(a.endTime!, startTime), buffer),
                            timeInSegmentToPercentInSegment(Types.timeInMovieToTimeInSegment(a.startTime!, startTime), buffer)
                        )
                    ) +
                    '%'
                }
                height={'100%'}
                opacity={0}
            />
            <line
                ref={handleLeftRef}
                x1={movieToPercent(a.startTime!, startTime, buffer)}
                x2={movieToPercent(a.startTime!, startTime, buffer)}
                y1={'0%'}
                y2={'100%'}
                strokeWidth={10}
                opacity={0}
                stroke={'blue'}
            />
            <line
                ref={handleRightRef}
                x1={movieToPercent(a.endTime!, startTime, buffer)}
                x2={movieToPercent(a.endTime!, startTime, buffer)}
                y1={'0%'}
                y2={'100%'}
                strokeWidth={10}
                opacity={0}
                stroke={'blue'}
            />
        </g>
    )
})
