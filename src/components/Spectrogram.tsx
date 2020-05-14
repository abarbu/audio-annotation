import React, { useEffect, useState, forwardRef, RefObject } from 'react'
import { useWindowSize } from '../Misc'
import * as Types from '../Types'
import _ from 'lodash'

export default React.memo(function Spectrogram({
    canvasStyle = { objectFit: 'fill', width: '100%', height: '100%' },
    src,
}: {
    canvasStyle?: React.CSSProperties
    src: string
}) {
    return <img style={canvasStyle} src={src} />
})
