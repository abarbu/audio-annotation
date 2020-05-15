import React, { useEffect, useState, forwardRef, RefObject } from 'react'
import { useWindowSize } from '../Misc'
import * as Types from '../Types'
import _ from 'lodash'

function drawWaveformFromBuffer(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    shift: number,
    buffer: AudioBuffer
) {
    var data = buffer.getChannelData(0)
    var step = Math.floor(data.length / width)
    var amp = height / 2
    let normalize = Math.max(Math.abs(_.min(data)!), Math.abs(_.max(data)!))
    let offset = _.mean(data)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    for (var i = 0; i < width; i++) {
        var min = 1.0
        var max = -1.0
        var datum
        for (var j = 0; j < step; j++) {
            datum = data[i * step + j]
            if (datum < min) min = datum
            if (datum > max) max = datum
        }
        min = (min - offset) / normalize
        max = (max - offset) / normalize
        if (!_.isUndefined(datum)) {
            ctx.fillRect(i, Math.floor(shift + min * amp), 1, Math.ceil((max - min) * amp))
        }
    }
}

export function drawWaveform(waveformCanvas: HTMLCanvasElement, buffer: AudioBuffer) {
    let ctx = waveformCanvas.getContext('2d')!
    ctx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height)
    drawWaveformFromBuffer(ctx, waveformCanvas.width, waveformCanvas.height, waveformCanvas.height * 0.5, buffer)
}

const Waveform = forwardRef(function Waveform(
    { canvasStyle = {}, decodedBuffer = null }: { canvasStyle?: React.CSSProperties; decodedBuffer: null | AudioBuffer },
    ref: React.Ref<HTMLCanvasElement>
) {
    const size = useWindowSize()
    useEffect(() => {
        if (decodedBuffer && ref) {
            let r = ref as RefObject<HTMLCanvasElement>
            r.current!.width = r.current!.getBoundingClientRect().width
            r.current!.height = r.current!.getBoundingClientRect().height
            drawWaveform(r.current!, decodedBuffer)
        }
    }, [ref, size, decodedBuffer])
    return <canvas style={canvasStyle} ref={ref}></canvas>
})

export default Waveform
