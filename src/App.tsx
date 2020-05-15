import React, { Component } from 'react'
import {
    ReloadOutlined,
    SaveOutlined,
    InfoCircleTwoTone,
    SaveTwoTone,
    EyeTwoTone,
    ToolTwoTone,
} from '@ant-design/icons'
import { Typography, Alert, Tag, Layout, Menu, Breadcrumb, PageHeader, Button, Space, Radio } from 'antd'
import './App.less'
import EditorUI from './components/EditorUI'
import * as Types from './Types'

const { Header, Content, Footer } = Layout
const { Paragraph } = Typography

class App extends Component {
    render() {
        return (
            <Layout className="layout">
                <PageHeader
                    className="site-page-header"
                    tags={<Alert message="Warning text" showIcon />}
                    title="Audio annotation"
                    subTitle="TODO Insert movie name and more"
                    extra={[
                        <Button key="2" type="primary" icon={<ReloadOutlined />} danger={true} size="large">
                            Reload
            </Button>,
                        <Button className="element-saves" icon={<SaveOutlined />} key="1" type="primary" size="large">
                            Save
            </Button>,
                    ]}
                >
                    <>
                        <Paragraph>
                            <Space size={10}>
                                Instructions
                <a className="header-link">
                                    <InfoCircleTwoTone /> What am I doing?
                </a>
                                <a className="header-link">
                                    <EyeTwoTone /> How does this tool work?
                </a>
                                <a className="header-link">
                                    <ToolTwoTone /> Show me the keyboard shortcuts
                </a>
                            </Space>
                        </Paragraph>
                    </>
                </PageHeader>
                <Content className="main-content" style={{ padding: '0 20px', backgroundColor: 'transparent' }}>
                    <EditorUI
                        currentWorker="andrei"
                        workers={['rev', 'andrei']}
                        movieName="lotr-1"
                        startTime={Types.to(604)}
                        endTime={Types.to(608)}
                    />
                </Content>
            </Layout>
        )
    }
}

export default App
