import React, { useCallback } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import { Tag } from 'antd'

function wordColor(annotation: Types.Annotation, isSelected: boolean) {
    if (_.isUndefined(annotation.startTime)) {
        return '#f50'
    } else if (isSelected) {
        return '#fa8c16'
    } else {
        return '#87d068'
    }
}

export default function EditorTranscriptWord({
    annotation,
    isSelected,
    onClick,
}: {
    annotation: Types.Annotation
    isSelected: boolean
    onClick: (a: Types.Annotation) => any
}) {
    const onClickLocal = useCallback(
        e => {
            onClick(annotation)
            e.preventDefault()
        },
        [annotation, onClick]
    )

    return (
        <Tag className="word" color={wordColor(annotation, isSelected)} onClick={onClickLocal}>
            {annotation.word}
        </Tag>
    )
}
