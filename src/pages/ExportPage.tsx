import React, { useEffect } from 'react'
import { Card, Typography, Layout, PageHeader, Button } from 'antd'
import { apihost } from '../Misc'
import '../App.less'
import _ from 'lodash'
import Prism from 'prismjs'
import '../prism.css'

const { Paragraph } = Typography

const exampleJSON = `{
  "movie:annotations:v3:lotr-1:andrei": 
    [
      {
        "startTime": 1018.0319148936169,
        "endTime": 1018.7712765957446,
        "word": "bit"
      }
    ],
  "movie:annotations:v3:movie-name:user":
    [
      {
        "startTime": seconds-since-start-of-movie,
        "endTime": seconds-since-start-of-movie,
        "word": word-without-punctuation
      }
    ]
}`

export default function ExportPage() {
    const downloadDB = () => {
        var link = document.createElement('a')
        link.href = apihost + 'api/fetch-db'
        link.download = 'Your_file_name'
        link.click()
    }

    useEffect(() => Prism.highlightAll(), [])

    return (
        <Layout className="layout">
            <PageHeader className="site-page-header" title="Export annotations"></PageHeader>
            <div>
                <Card title="Download the entire database" bordered={false}>
                    <Paragraph>This may take a few moments ...</Paragraph>
                    <Button type="primary" danger={true} size="large" onClick={downloadDB}>
                        Download DB
          </Button>
                    <br />
                    <br />
                    <br />
                    <Paragraph>
                        The file format looks like the one below. Additional fields are possible, but you should ignore them and
                        they won't be consistently available.
          </Paragraph>
                    <pre>
                        <code className="language-json5">{exampleJSON}</code>
                    </pre>
                </Card>
            </div>
        </Layout>
    )
}
