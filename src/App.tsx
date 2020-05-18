import React, { Component, useState } from 'react'
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
import EditorPage from './pages/EditorPage'
import * as Types from './Types'
import { BrowserRouter as Router, Switch, Route, Link, useParams } from 'react-router-dom'

const { Header, Content, Footer } = Layout
const { Paragraph } = Typography

export default function App() {
    /* TODO Make some reasonable default */
    return (
        <Router>
            <Switch>
                <Route path="/audio-ui" children={<EditorPage />} />
            </Switch>
        </Router>
    )
}
