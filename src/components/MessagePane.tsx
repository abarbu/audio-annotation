import React, { useCallback, useState, MutableRefObject } from 'react'
import { Alert } from 'antd'
import '../App.less'
import * as Types from '../Types'
import _ from 'lodash'

export default function MessagePane({
    onMessageRef,
}: {
    onMessageRef: MutableRefObject<(level: Types.MessageLevel, value: string) => any>
}) {
    const [message, setMessage] = useState({ level: Types.MessageLevel.info, value: 'Loading...' })
    onMessageRef.current = useCallback(
        (level: Types.MessageLevel, value: string) => {
            setMessage(prev => (_.isEqual(message, { level: level, value: value }) ? prev : { level: level, value: value }))
        },
        [setMessage]
    )

    return message.level === 'closed' ? (
        <></>
    ) : (
            // @ts-ignore
            <Alert message={message.value} showIcon type={message.level} />
        )
}
