import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import { Typography, Tag, Input, Row, Col, Space, Divider, Card, Button, Radio } from 'antd'

const { Text } = Typography

export default React.memo(function EditorReferenceSelector({
    workers,
    movieName,
    startTime,
    endTime,
}: {
    workers?: string[]
    movieName?: string
    startTime?: Types.TimeInMovie
    endTime?: Types.TimeInMovie
}) {
    return (
        <Card bordered={false} size="small" style={{ backgroundColor: 'transparent' }} bodyStyle={{ padding: '4px' }}>
            <div style={{ textAlign: 'center' }}>
                <Text strong>Reference annotations </Text>
                <Radio.Group defaultValue="none" size="small" buttonStyle="solid">
                    <Radio.Button value="none">None</Radio.Button>
                    <Radio.Button value="happyscribe" disabled>
                        happyscribe
          </Radio.Button>
                    <Radio.Button value="rev">rev</Radio.Button>
                </Radio.Group>
            </div>
        </Card>
    )
})
