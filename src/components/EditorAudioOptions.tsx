import React, { useCallback } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import { Typography, Card, Radio } from 'antd'
import { RadioChangeEvent } from 'antd/es/radio'

const { Text } = Typography

export default React.memo(function EditorAudioOptions({
    playbackRate,
    setPlaybackRate,
}: {
    playbackRate: 'normal' | 'half'
    setPlaybackRate: (arg: 'normal' | 'half') => any
}) {
    const onChange = useCallback(
        (e: RadioChangeEvent) => {
            setPlaybackRate(e.target.value)
        },
        [setPlaybackRate]
    )

    return (
        <Card bordered={false} size="small" style={{ backgroundColor: 'transparent' }} bodyStyle={{ padding: '4px' }}>
            <div style={{ textAlign: 'center' }}>
                <Text strong>Reference annotations </Text>
                <Radio.Group value={playbackRate} size="small" buttonStyle="solid" onChange={onChange}>
                    <Radio.Button value={'half'}>0.5x</Radio.Button>
                    <Radio.Button value={'normal'}>1.0x</Radio.Button>
                </Radio.Group>
            </div>
        </Card>
    )
})
