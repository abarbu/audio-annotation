import React, { useEffect, useState, useRef, forwardRef, RefObject } from 'react'
import { useWindowSize } from '../Misc'
import * as Types from '../Types'
import * as d3 from 'd3'

export function drawClick(regionCanvas: HTMLCanvasElement, offset: Types.PlayerPosition) {
    let ctx = regionCanvas.getContext('2d')!
    ctx.clearRect(0, 0, regionCanvas.width, regionCanvas.height)
    ctx.fillStyle = 'rgba(200, 0, 0, 0.9)'
    ctx.fillRect(Types.from(offset), 1, 2, regionCanvas.height)
}

export function drawRegion(
    regionCanvas: HTMLCanvasElement,
    startOffset: Types.PlayerPosition,
    endOffset: Types.PlayerPosition,
    drawEnd: boolean
) {
    let ctx = regionCanvas.getContext('2d')!
    ctx.clearRect(0, 0, regionCanvas.width, regionCanvas.height)
    ctx.fillStyle = 'rgba(200, 0, 0, 0.9)'
    ctx.fillRect(Types.from(endOffset), 1, 2, regionCanvas.height)
    ctx.fillRect(Types.from(startOffset), 1, 2, regionCanvas.height)
    ctx.fillStyle = 'rgba(200, 0, 0, 0.05)'
    ctx.fillRect(Types.from(startOffset), 1, Types.from(endOffset) - Types.from(startOffset), regionCanvas.height)
}

export function redraw(
    regionCanvas: HTMLCanvasElement,
    regionStart: null | Types.PercentInSegment,
    regionEnd: null | Types.PercentInSegment
) {
    if (regionEnd) {
        if (regionStart) {
            drawRegion(
                regionCanvas,
                percentToPosition(regionStart!, regionCanvas),
                percentToPosition(regionEnd!, regionCanvas),
                true
            )
        } else {
            drawClick(regionCanvas, percentToPosition(regionEnd!, regionCanvas))
        }
    }
}

function percentToPosition(p: Types.PercentInSegment, canvas: HTMLCanvasElement): Types.PlayerPosition {
    return Types.to(Types.from(p) * canvas.width)
}

function positionToPercent(p: Types.PlayerPosition, canvas: HTMLCanvasElement): Types.PercentInSegment {
    return Types.to(Types.from(p) / canvas.width)
}

const RegionPlayer = React.memo(
    forwardRef(function RegionPlayer(
        {
            canvasStyle = {},
            decodedBuffer = null,
            onMouseDown = () => 0,
            onClick = () => 0,
            onSelectRegion = () => 0,
            dragRef,
        }: {
            canvasStyle?: React.CSSProperties
            decodedBuffer: null | AudioBuffer
            onMouseDown: () => any
            onClick?: (position: Types.PercentInSegment, shiftKey: boolean) => any
            onSelectRegion?: (start: Types.PercentInSegment, end: Types.PercentInSegment) => any
            dragRef?: React.MutableRefObject<Types.DragFunctions>
        },
        ref: React.Ref<HTMLCanvasElement>
    ) {
        const regionStart = useRef<null | Types.PercentInSegment>(null)
        const lastClick = useRef<null | Types.PercentInSegment>(null)
        const size = useWindowSize()

        useEffect(() => {
            if (decodedBuffer && ref) {
                let canvas = (ref as RefObject<HTMLCanvasElement>).current!
                canvas.width = canvas.getBoundingClientRect().width
                canvas.height = canvas.getBoundingClientRect().height
                redraw(canvas, regionStart.current, lastClick.current)
            }
        }, [ref, size, decodedBuffer])

        useEffect(() => {
            if (ref) {
                let dr = dragRef ? (dragRef as React.MutableRefObject<Types.DragFunctions>) : { current: null }
                dr.current = {
                    onClear: () => {
                        let r = ref as RefObject<HTMLCanvasElement>
                        let ctx = r.current!.getContext('2d')!
                        ctx.clearRect(0, 0, r.current!.width, r.current!.height)
                    },
                    onDrag: (x: number) => {
                        let r = ref as RefObject<HTMLCanvasElement>
                        let end = positionToPercent(Types.to(x), r.current!)
                        redraw(r.current!, regionStart.current, end)
                        d3.event.sourceEvent.preventDefault()
                    },
                    onDragStart: (x: number) => {
                        let r = ref as RefObject<HTMLCanvasElement>
                        regionStart.current = positionToPercent(Types.to(x), r.current!)
                        lastClick.current = null
                        redraw(r.current!, regionStart.current, regionStart.current)
                        d3.event.sourceEvent.preventDefault()
                    },
                    onDragEnd: (x: number) => {
                        let r = ref as RefObject<HTMLCanvasElement>
                        lastClick.current = positionToPercent(Types.to(x), r.current!)
                        redraw(r.current!, regionStart.current, lastClick.current)
                        if (Math.abs(Types.from(regionStart.current!) - Types.from(lastClick.current)) < 0.001)
                            onClick(lastClick.current!, d3.event.sourceEvent.shiftKey)
                        else if (Types.from(regionStart.current!) <= Types.from(lastClick.current))
                            onSelectRegion(regionStart.current!, lastClick.current)
                        else onSelectRegion(lastClick.current!, regionStart.current!)
                        d3.event.sourceEvent.preventDefault()
                    },
                }
                const e = d3.select((ref as RefObject<HTMLCanvasElement>).current)
                e.call(
                    // @ts-ignore
                    d3
                        .drag()
                        .on('start', () => dr.current!.onDragStart(d3.event.x))
                        .on('end', () => dr.current!.onDragEnd(d3.event.x))
                        .on('drag', () => dr.current!.onDrag(d3.event.x))
                )
            }
        }, [ref])

        return <canvas style={canvasStyle} ref={ref} />
    })
)

export default RegionPlayer
