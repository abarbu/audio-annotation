import React, { useEffect, forwardRef, RefObject } from 'react'
import * as Types from '../Types'
import _ from 'lodash'

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
                    y1={orientation === 'top' ? '0%' : '100%'}
                    y2={orientation === 'top' ? '0%' : '100%'}
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
                                    y1={orientation === 'top' ? '0%' : '100%'}
                                    y2={orientation === 'top' ? '20%' : '70%'}
                                    strokeWidth={2}
                                    opacity={1}
                                    stroke={'green'}
                                />
                                <text
                                    style={{
                                        fontFamily: 'sans-serif',
                                        fontSize: '10px',
                                        fill: 'lightgreen',
                                        textAnchor: t === 0 ? 'start' : 1 - t < 0.01 ? 'end' : 'middle',
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
