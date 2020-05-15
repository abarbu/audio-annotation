import React, { useEffect, useRef, useState, useCallback, MutableRefObject } from 'react'
import * as Types from '../Types'
import { timeInSegmentToPercentInSegment, percentInSegmentToTimeInSegment } from '../components/Audio'
import AnnotatedWord from '../components/AnnotatedWord'
import _ from 'lodash'
import * as d3 from 'd3'

// SVG does not have the concept of a z index. Draw order determines priority,
// so we have to reorder annotations.
function reorderSelectedAnnotations(as: Types.Annotation[], selectedIndex: number | null) {
    _.forEach(as, (a, key) => a.index = key)
    let selected = _.filter(as, a => a.index === selectedIndex)
    let notSelected = _.filter(as, a => a.index !== selectedIndex)
    return _.concat(notSelected, selected)
}

export function shouldRejectAnnotationUpdate(annotations: Types.Annotation[],
    next: Types.Annotation, ): boolean {
    if (Types.from(next.endTime!) - 0.01 <= Types.from(next.startTime!)) return true
    if (Types.from(next.startTime!) + 0.01 >= Types.from(next.endTime!)) return true
    if (
        _.filter(
            annotations,
            (a: Types.Annotation) =>
                Types.isValidAnnotation(a) &&
                (Types.from(a.startTime!) > Types.from(next.startTime!) && a.index < next.index)
        ).length > 0
    )
        return true
    if (
        _.filter(
            annotations,
            (a: Types.Annotation) =>
                Types.isValidAnnotation(a) &&
                (Types.from(a.startTime!) < Types.from(next.startTime!) && a.index > next.index)
        ).length > 0
    )
        return true
    return false
}

export function updateAnnotation(
    setAnnotations: (fn: (prev: Types.Annotation[]) => Types.Annotation[]) => void,
    decodedBuffer: AudioBuffer,
    shouldRejectUpdate: ((as: Types.Annotation[], next: Types.Annotation)
        => boolean)
) {
    return (a: Types.Annotation) => {
        setAnnotations((prev: Types.Annotation[]) => {
            let newas = _.clone(prev)
            newas[a.index] = _.clone(a)
            if (shouldRejectUpdate(prev, newas[a.index])) {
                return prev
            } else {
                return newas
            }
        })
    }
}

export default React.memo(function AnnotationLayer({
    annotations = [],
    svgStyle = {},
    startTime,
    buffer,
    color = 'green',
    colorSelected = 'red',
    textHeight = '60%',
    midlineHeight = '50%',
    onWordClicked = () => null,
    updateAnnotation = () => null,
    selectable = false,
    onBackgroundDrag = () => null,
    onBackgroundDragStart = () => null,
    onBackgroundDragEnd = () => null,
    onInteract = () => null
}: {
    annotations: Types.Annotation[]
    svgStyle?: React.CSSProperties
    startTime: Types.TimeInMovie
    buffer: AudioBuffer | null
    color?: string
    colorSelected?: string
    textHeight?: string
    midlineHeight?: string
    onWordClicked?: ((a: Types.Annotation, startTime: Types.TimeInMovie) => any)
    updateAnnotation?: ((a: Types.Annotation) => any)
    selectable?: boolean
    onBackgroundDrag?: (x: number) => any
    onBackgroundDragStart?: (x: number) => any
    onBackgroundDragEnd?: (x: number) => any
    onInteract?: () => any
}) {
    const [selected, setSelected] = useState<null | number>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const annotations_ = useRef<Types.Annotation[]>(annotations)
    useEffect(() => {
        annotations_.current = annotations
    }, [annotations])
    useEffect(() => {
        if (svgRef.current) {
            const e = d3.select(svgRef.current)
            // @ts-ignore
            e.call(d3.drag()
                .on('start', () => {
                    onBackgroundDragStart(d3.event.x)
                    d3.event.sourceEvent.preventDefault()
                    return true
                })
                .on('end', () => {
                    onBackgroundDragEnd(d3.event.x)
                    d3.event.sourceEvent.preventDefault()
                    return true
                })
                .on('drag', () => {
                    onBackgroundDrag(d3.event.x)
                })
            )
        }
    }, [svgRef, buffer])
    const onSelectFn = useCallback((a: Types.Annotation) => {
        onInteract()
        if (selectable) setSelected(a.index)
    }, [onInteract, selectable, setSelected])
    const onEndClickedFn = useCallback((x, startTime) => {
        onInteract()
        onWordClicked(x, startTime)
    }, [onInteract, onWordClicked])
    const updateAnnotationFn = useCallback(a => {
        onInteract()
        updateAnnotation(a)
    }, [onInteract, updateAnnotation])

    if (buffer) {
        return (
            <svg preserveAspectRatio="none" style={svgStyle} ref={svgRef}>
                <defs>
                    <filter id="blackOutlineEffect">
                        <feMorphology in="SourceAlpha" result="MORPH" operator="dilate" radius="2" />
                        <feColorMatrix
                            in="MORPH"
                            result="DARKEN"
                            type="matrix"
                            values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 0.6 0"
                        />
                        <feMerge>
                            <feMergeNode in="DARKEN" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {reorderSelectedAnnotations(annotations, selected).map(a => {
                    let key = a.index
                    return (
                        <g key={key}>
                            <AnnotatedWord
                                annotation={a}
                                annotationsRef={annotations_}
                                enclosingRef={svgRef}
                                startTime={startTime}
                                buffer={buffer}
                                color={color}
                                colorSelected={colorSelected}
                                textHeight={textHeight}
                                midlineHeight={midlineHeight}
                                selected={selected === key}
                                onSelect={onSelectFn}
                                onEndClicked={onEndClickedFn}
                                updateAnnotation={updateAnnotationFn}
                                shouldRejectUpdate={shouldRejectAnnotationUpdate}
                            />
                        </g>
                    )
                })}
            </svg>
        )
    }
    return null
})
