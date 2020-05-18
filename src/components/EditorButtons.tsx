import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import { Typography, Input, Space, Divider, Card, Button } from 'antd'
import {
    PlayCircleOutlined,
    CloseOutlined,
    LeftOutlined,
    DoubleLeftOutlined,
    RightOutlined,
    DoubleRightOutlined,
    CaretRightOutlined,
    PauseOutlined,
} from '@ant-design/icons'

export default React.memo(function EditorButtons({
    onPlayFromBeginning = () => null,
    onStop = () => null,
    onStartNextWord = () => null,
    onStartWordAfterWord = () => null,
    onPlaySelection = () => null,
    onDeleteSelection = () => null,
    onUnselect = () => null,
    onReplaceWithReference = () => null,
    onFillWithReference = () => null,
    onBack4s = () => null,
    onBack2s = () => null,
    onForward2s = () => null,
    onForward4s = () => null,
}: {
    onPlayFromBeginning?: () => any
    onStop?: () => any
    onStartNextWord?: () => any
    onStartWordAfterWord?: () => any
    onPlaySelection?: () => any
    onDeleteSelection?: () => any
    onUnselect?: () => any
    onReplaceWithReference?: () => any
    onFillWithReference?: () => any
    onBack4s?: () => any
    onBack2s?: () => any
    onForward2s?: () => any
    onForward4s?: () => any
}) {
    return (
        <Card
            bordered={false}
            size={'small'}
            style={{ backgroundColor: 'transparent' }}
            bodyStyle={{ paddingBottom: '0px' }}
        >
            <div className="button-row" style={{ wordWrap: 'break-word', textAlign: 'center' }}>
                <Space size={1}>
                    <Button
                        className="element-neutral"
                        icon={<CaretRightOutlined />}
                        type="primary"
                        size="small"
                        onClick={onPlayFromBeginning}
                    >
                        Play from beginning
          </Button>
                    <Button className="element-neutral" icon={<PauseOutlined />} type="primary" size="small" onClick={onStop}>
                        Stop
          </Button>
                </Space>
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Space size={1}>
                    <Button className="element-neutral" type="primary" size="small" onClick={onStartNextWord}>
                        Start next word
          </Button>
                    <Button className="element-neutral" type="primary" size="small" onClick={onStartWordAfterWord}>
                        Start word after word
          </Button>
                </Space>
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Space size={1}>
                    <Button
                        className="element-neutral"
                        icon={<PlayCircleOutlined />}
                        type="primary"
                        size="small"
                        onClick={onPlaySelection}
                    >
                        Play selection
          </Button>
                    <Button
                        className="element-neutral"
                        icon={<CloseOutlined />}
                        type="primary"
                        size="small"
                        onClick={onDeleteSelection}
                    >
                        Delete selection
          </Button>
                    <Button className="element-neutral" type="primary" size="small" onClick={onUnselect}>
                        Unselect
          </Button>
                </Space>
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Space size={1}>
                    <Button className="element-neutral" type="primary" size="small" onClick={onReplaceWithReference}>
                        Replace with reference
          </Button>
                    <Button className="element-neutral" type="primary" size="small" onClick={onFillWithReference}>
                        Use reference to fill remainder
          </Button>
                </Space>
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Space size={1}>
                    <Button className="element-saves" type="primary" size="small" onClick={onBack4s}>
                        <DoubleLeftOutlined />
                        -4s
          </Button>
                    <Button className="element-saves" type="primary" size="small" onClick={onBack2s}>
                        <LeftOutlined />
                        Backward 2s
          </Button>
                    <Button className="element-saves" type="primary" size="small" onClick={onForward2s}>
                        Forward 2s <RightOutlined />
                    </Button>
                    <Button className="element-saves" type="primary" size="small" onClick={onForward4s}>
                        +4s <DoubleRightOutlined />
                    </Button>
                </Space>
            </div>
        </Card>
    )
})
