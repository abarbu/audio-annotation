import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import { Typography, Tag, Input, Divider, Card, Button } from 'antd'
import EditorTranscriptWord from '../components/EditorTranscriptWord'

const { Text } = Typography

const cardStyle = { backgroundColor: 'transparent' }
const cardBodyStyle = { padding: '4px' }

const InfoArea = React.memo(() => {
    return (
        <>
            <br></br>
            <Text strong>Special cases:</Text>
            <div style={{ display: 'inline-block' }}>
                <Text code className="transcript-special-cases-1">
                    If you can't make out a word or someone is not speaking English use '#' as a placeholder.
        </Text>
            </div>
            <div style={{ display: 'inline-block' }}>
                <Text code className="transcript-special-cases-2">
                    If multiple speakers are overlapping, annotate the whole region with '%'.
        </Text>
            </div>
            <br></br>
            <Text strong>Legend: </Text>
            <Tag color="#87d068">Your annotation</Tag>
            <Tag color="#f50">Unannotated word</Tag>
            <Tag color="#fa8c16">Selected word</Tag>
            <Tag color="#2db7f5">Reference annotation</Tag>
        </>
    )
})

export default React.memo(
    React.forwardRef(function EditorTranscript(
        {
            annotations,
            selected,
            setSelected,
            setIsLocked,
            onUpdateTranscript,
        }: {
            annotations: Types.Annotation[]
            selected: null | number
            setSelected: (arg: number | null, ann: null | Types.Annotation) => any
            setIsLocked: (b: boolean) => any
            onUpdateTranscript: (a: string[]) => any
        },
        buttonRef: React.Ref<HTMLElement>
    ) {
        const [inputMode, setInputMode] = useState(false)
        const inputRefValue = useRef<Input>(null)
        const inputRef = useCallback((node: Input | null) => {
            if (node) {
                console.log('input ref', node) /* TODO Set my pointer on the location that is selected */
                // @ts-ignore
                inputRefValue.current = node
                node.focus()
            }
        }, [])

        const onEditButton = useCallback(() => {
            setSelected(null, null)
            setInputMode(!inputMode)
            if (!_.isNull(inputRefValue.current)) {
                // @ts-ignore
                onUpdateTranscript(_.split(inputRefValue.current.state.value, ' '))
            }
        }, [inputMode, setSelected])

        const onWordClick = useCallback(
            ann => {
                setSelected(ann.index, ann)
            },
            [setSelected]
        )

        return (
            <Card bordered={false} size="small" style={cardStyle} bodyStyle={cardBodyStyle}>
                <div style={{ wordWrap: 'break-word', textAlign: 'center' }} className="transcript-area">
                    <Button ref={buttonRef} danger className={'change-transcript'} size="middle" onClick={onEditButton}>
                        {inputMode ? 'Change transcript' : 'Edit transcript'}
                    </Button>
                    {inputMode ? (
                        <Input
                            onPressEnter={onEditButton}
                            ref={inputRef}
                            placeholder="Enter transcript"
                            style={{ width: '80%' }}
                            defaultValue={_.join(_.map(annotations, a => a.word), ' ')}
                        />
                    ) : (
                            <>
                                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                                {_.map(annotations, ann => {
                                    return (
                                        <EditorTranscriptWord
                                            key={ann.index}
                                            annotation={ann}
                                            isSelected={ann.index === selected}
                                            onClick={onWordClick}
                                        />
                                    )
                                })}
                            </>
                        )}
                    <InfoArea />
                </div>
            </Card>
        )
    })
)
