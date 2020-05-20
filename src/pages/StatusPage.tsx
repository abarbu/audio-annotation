import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ReloadOutlined, SaveOutlined, InfoCircleTwoTone, EyeTwoTone, ToolTwoTone } from '@ant-design/icons'
import { Typography, Tag, Layout, PageHeader, Button, Space, Menu, Dropdown, Spin } from 'antd'
import { apihost } from '../Misc'
import '../App.less'
import EditorUI from '../components/EditorUI'
import MessagePane from '../components/MessagePane'
import * as Types from '../Types'
import _ from 'lodash'
import queryString from 'query-string'
import Tour from 'reactour'
import EditorButtons from '../components/EditorButtons'
import AudioPosition, { drawAudioPercent, clearAudioPosition } from '../components/AudioPosition'
import Waveform from '../components/Waveform'
import Timeline from '../components/Timeline'
import Audio, {
    percentInSegmentToTimeInSegment,
    playAudioPercent,
    playAudioInMovie,
    AudioState,
} from '../components/Audio'
import Spectrogram from '../components/Spectrogram'
import RegionPlayer from '../components/RegionPlayer'
import AnnotationLayer, { updateAnnotation, shouldRejectAnnotationUpdate } from '../components/AnnotationLayer'

const { Content } = Layout
const { Paragraph } = Typography

const spectrogramAnnotationStyle: React.CSSProperties = {
    width: '100%',
    height: '85%',
    position: 'absolute',
    top: '0%',
    zIndex: 4,
}

export default function StatusPage() {
    const onReloadFn = () => null

    const [users, setUsers] = useState<string[] | null>(null)
    const [movies, setMovies] = useState<string[] | null>(null)

    const [rawAudioBuffer, setRawAudioBuffer] = useState(null as null | ArrayBuffer)
    const [decodedBuffer, setDecodedBuffer] = useState<null | AudioBuffer>(null)

    const load = useCallback(() => {
        Promise.all(
            _.map([`${apihost}api/worker-list`, `${apihost}api/movie-list`], (url: string) =>
                fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }).then(res => res.json())
            )
        ).then(res => {
            setUsers(res[0])
            setMovies(res[1])
        })
    }, [])

    useEffect(() => load(), [])

    const onPlayFromBeginning = () => null
    const onStop = () => null
    const onBack4s = () => null
    const onBack2s = () => null
    const onForward2s = () => null
    const onForward4s = () => null

    return (
        <Layout className="layout">
            <PageHeader
                className="site-page-header"
                title="Annotation status"
                extra={[
                    <Button key="1" type="primary" icon={<ReloadOutlined />} danger={true} size="large" onClick={onReloadFn}>
                        Reload
          </Button>,
                ]}
            >
                {_.isNull(users) || _.isNull(movies) ? (
                    <Spin size="large" />
                ) : (
                        <Content className="main-content">
                            <EditorButtons
                                onPlayFromBeginning={onPlayFromBeginning}
                                onStop={onStop}
                                onBack4s={onBack4s}
                                onBack2s={onBack2s}
                                onForward2s={onForward2s}
                                onForward4s={onForward4s}
                                simple={true}
                            />
                        </Content>
                    )}
            </PageHeader>
        </Layout>
    )
}
