import React from 'react'
import './App.less'
import EditorPage from './pages/EditorPage'
import ExportPage from './pages/ExportPage'
import StatusPage from './pages/StatusPage'
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'

export default function App() {
    /* TODO Make some reasonable default */
    return (
        <Router>
            <Switch>
                <Route path="/audio-ui" children={<EditorPage />} />
                <Route path="/export" children={<ExportPage />} />
                <Route path="/status" children={<StatusPage />} />
            </Switch>
        </Router>
    )
}
