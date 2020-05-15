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

export default React.memo(function EditorButtons({ }: {}) {
    return (
        <Card bordered={false} size={'small'} style={{ backgroundColor: 'transparent' }}>
            <div className="button-row" style={{ wordWrap: 'break-word', textAlign: 'center' }}>
                <Space size={1}>
                    <Button className="element-neutral" icon={<CaretRightOutlined />} type="primary" size="small">
                        Play from beginning
          </Button>
                    <Button className="element-neutral" icon={<PauseOutlined />} type="primary" size="small">
                        Stop
          </Button>
                </Space>
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Space size={1}>
                    <Button className="element-neutral" type="primary" size="small">
                        Start next word
          </Button>
                    <Button className="element-neutral" type="primary" size="small">
                        Start word after word
          </Button>
                </Space>
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Space size={1}>
                    <Button className="element-neutral" icon={<PlayCircleOutlined />} type="primary" size="small">
                        Play selection
          </Button>
                    <Button className="element-neutral" icon={<CloseOutlined />} type="primary" size="small">
                        Delete selection
          </Button>
                </Space>
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Space size={1}>
                    <Button className="element-neutral" type="primary" size="small">
                        Replace with reference
          </Button>
                    <Button className="element-neutral" type="primary" size="small">
                        Use reference to fill remainder
          </Button>
                </Space>
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Space size={1}>
                    <Button className="element-saves" type="primary" size="small">
                        <DoubleLeftOutlined />
                        -4s
          </Button>
                    <Button className="element-saves" type="primary" size="small">
                        <LeftOutlined />
                        Backward 2s
          </Button>
                    <Button className="element-saves" type="primary" size="small">
                        Forward 2s <RightOutlined />
                    </Button>
                    <Button className="element-saves" type="primary" size="small">
                        +4s <DoubleRightOutlined />
                    </Button>
                </Space>
            </div>
        </Card>
    )
})
