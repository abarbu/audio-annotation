import React, { useEffect, useState, useRef, forwardRef, RefObject } from 'react'
import { useWindowSize } from '../Misc'
import * as Types from '../Types'

export function drawAudioPercent(canvas_: React.RefObject<HTMLCanvasElement>, now: Types.PercentInSegment) {
    if (canvas_.current) {
        let canvas = canvas_.current
        let ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)'
        ctx.fillRect(Math.floor(canvas.width * Types.from(now)), 1, 1, canvas.height)
    }
}

export function clearAudioPosition(canvas_: React.RefObject<HTMLCanvasElement>) {
    if (canvas_.current) {
        let canvas = canvas_.current
        let ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
}

const AudioPosition = forwardRef(function RegionPlayer(
    {
        canvasStyle = {},
    }: {
        canvasStyle?: React.CSSProperties
    },
    ref: React.Ref<HTMLCanvasElement>
) {
    const size = useWindowSize()
    useEffect(() => {
        if (ref) {
            let canvas = (ref as RefObject<HTMLCanvasElement>).current!
            canvas.width = canvas.getBoundingClientRect().width
            canvas.height = canvas.getBoundingClientRect().height
        }
    }, [ref, size])
    return <canvas style={canvasStyle} ref={ref}></canvas>
})

export default AudioPosition
