import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import { Typography, Tag, Input, Row, Col, Space, Divider, Card, Button, Radio } from 'antd'

const { Search } = Input

export default React.memo(function EditorAdvancedButtons({
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
            <div style={{ wordWrap: 'break-word', textAlign: 'center' }}>
                <Button type="primary" size="small">
                    Go to last annotation
        </Button>
                <Search
                    style={{ width: '15em', marginBottom: '2px' }}
                    placeholder="position"
                    enterButton="Go to position"
                    size="small"
                    onSearch={(value: any) => console.log(value)}
                />
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Search
                    style={{ width: '18em' }}
                    placeholder="worker"
                    enterButton="Change worker"
                    size="small"
                    onSearch={(value: any) => console.log(value)}
                />
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Search
                    style={{ width: '18em' }}
                    placeholder="movie"
                    enterButton="Change movie"
                    size="small"
                    onSearch={(value: any) => console.log(value)}
                />
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Search
                    style={{ width: '40em' }}
                    placeholder="annotators"
                    enterButton="Change references"
                    size="small"
                    onSearch={(value: any) => console.log(value)}
                />
            </div>
        </Card>
    )
})
