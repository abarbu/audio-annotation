import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import { Typography, Tag, Input, Divider, Card, Button } from 'antd'
import EditorTranscriptWord from '../components/EditorTranscriptWord'

const { Text } = Typography

export default React.memo(function EditorTranscript({
    annotations,
    selected,
    setIsLocked,
}: {
    annotations: Types.Annotation[]
    selected: null | number
    setIsLocked: (b: boolean) => any
}) {
    const [inputMode, setInputMode] = useState(false)
    const onEditButton = useCallback(() => setInputMode(!inputMode), [inputMode])

    return (
        <Card bordered={false} size="small" style={{ backgroundColor: 'transparent' }} bodyStyle={{ padding: '4px' }}>
            <div style={{ wordWrap: 'break-word', textAlign: 'center' }}>
                <Button danger size="middle" onClick={onEditButton}>
                    {inputMode ? 'Change transcript' : 'Edit transcript'}
                </Button>
                {inputMode ? (
                    <Input placeholder="Enter transcript" style={{ width: '80%' }} />
                ) : (
                        <>
                            <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                            {_.map(annotations, ann => {
                                return (
                                    <EditorTranscriptWord
                                        key={ann.index}
                                        annotation={ann}
                                        isSelected={ann.index === selected}
                                        onClick={() => console.log(ann)}
                                    />
                                )
                            })}
                        </>
                    )}
                <br></br>
                <Text strong>Special cases:</Text>
                <div style={{ display: 'inline-block' }}>
                    <Text code>If you can't make out a word or someone is not speaking English use '#' as a placeholder.</Text>
                </div>
                <div style={{ display: 'inline-block' }}>
                    <Text code>If multiple speakers are overlapping, annotate the whole region with '%'.</Text>
                </div>
                <br></br>
                <Text strong>Legend: </Text>
                <Tag color="#87d068">Your annotation</Tag>
                <Tag color="#f50">Unannotated word</Tag>
                <Tag color="#fa8c16">Selected word</Tag>
                <Tag color="#2db7f5">Reference annotation</Tag>
            </div>
        </Card>
    )
})
