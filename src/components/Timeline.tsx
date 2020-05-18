import React, { useEffect, useState, forwardRef, RefObject } from 'react'
import { useWindowSize } from '../Misc'
import * as Types from '../Types'
import _ from 'lodash'

export function drawTimeline(canvas: HTMLCanvasElement, startTime: Types.TimeInMovie, endTime: Types.TimeInMovie) {
    let ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 2
    ctx.strokeStyle = 'green'
    const stepSize = 0.1
    _.forEach(_.range(0, 1 + stepSize, stepSize), t => {
        let x = canvas.width * t
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height * 0.3)
        ctx.stroke()
        ctx.font = '15px Arial'
        ctx.imageSmoothingEnabled = true
        console.log((Types.from(endTime) - Types.from(startTime)) * t)
        console.log(Math.round(((Types.from(endTime) - Types.from(startTime)) * t) / 60))
        console.log(Math.floor((Types.from(endTime) - Types.from(startTime)) * t))
        console.log(Math.round(100 * (Types.from(endTime) - Types.from(startTime)) * t) / 100)
        /* ctx.fillText('' + Math.round(100 * (Types.from(endTime) - Types.from(startTime)) * t) / 100, 100, 0) */
        ctx.fillStyle = 'green'
        ctx.fillText('Woof', 50, 10)
    })
}

const stepSize = 0.2

const Timeline = React.memo(
    forwardRef(function Timeline(
        {
            svgStyle = {},
            startTime,
            endTime,
            orientation = 'top',
            labelHeightPecent = '50%',
        }: {
            svgStyle?: React.CSSProperties
            startTime: Types.TimeInMovie
            endTime: Types.TimeInMovie
            orientation?: 'top' | 'bottom'
            labelHeightPecent?: string
        },
        ref: React.Ref<SVGSVGElement>
    ) {
        const [, rerender] = React.useState()
        useEffect(() => rerender({}), [ref])
        return (
            <svg style={svgStyle} ref={ref}>
                <line
                    x1={0}
                    x2={'100%'}
                    y1={orientation == 'top' ? '0%' : '100%'}
                    y2={orientation == 'top' ? '0%' : '100%'}
                    strokeWidth={4}
                    opacity={1}
                    stroke={'green'}
                />
                // @ts-ignore
                {_.isNull(ref.current)
                    ? null
                    : _.map(_.range(0, 1 + stepSize, stepSize), t => {
                        const svg = (ref as RefObject<SVGSVGElement>).current!
                        const x = svg.clientWidth * t
                        // @ts-ignore
                        let date = new Date(null)
                        date.setMilliseconds(1000 * (Types.from(startTime) + t * (Types.from(endTime) - Types.from(startTime))))
                        const label = date.toISOString().substr(11, 10)
                        return (
                            <g key={t}>
                                <line
                                    x1={x}
                                    x2={x}
                                    y1={orientation == 'top' ? '0%' : '100%'}
                                    y2={orientation == 'top' ? '20%' : '70%'}
                                    strokeWidth={2}
                                    opacity={1}
                                    stroke={'green'}
                                />
                                <text
                                    style={{
                                        fontFamily: 'sans-serif',
                                        fontSize: '10px',
                                        fill: 'lightgreen',
                                        textAnchor: t == 0 ? 'start' : 1 - t < 0.01 ? 'end' : 'middle',
                                        cursor: 'default',
                                        userSelect: 'none',
                                    }}
                                    x={100 * t + '%'}
                                    y={labelHeightPecent}
                                >
                                    {label}
                                </text>
                            </g>
                        )
                    })}
            </svg>
        )
    })
)

export default Timeline

/* ctx.font = '15px Arial'
   ctx.imageSmoothingEnabled = true
   console.log((Types.from(endTime) - Types.from(startTime)) * t)
   console.log(Math.round(((Types.from(endTime) - Types.from(startTime)) * t) / 60))
   console.log(Math.floor((Types.from(endTime) - Types.from(startTime)) * t))
   console.log(Math.round(100 * (Types.from(endTime) - Types.from(startTime)) * t) / 100)
   /* ctx.fillText('' + Math.round(100 * (Types.from(endTime) - Types.from(startTime)) * t) / 100, 100, 0) */
/* ctx.fillStyle = 'green'
 * ctx.fillText('Woof', 50, 10) * /} */
