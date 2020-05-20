import React from 'react'
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
