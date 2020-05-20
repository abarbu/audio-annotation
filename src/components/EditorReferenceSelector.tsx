import React, { useCallback } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import { Typography, Card, Radio } from 'antd'

const { Text } = Typography

export default React.memo(function EditorReferenceSelector({
    annotations,
    reference,
    references,
    onSelectReferece,
}: {
    annotations: { [user: string]: Types.Annotation[] }
    reference: string
    references: string[]
    onSelectReferece: (reference: string) => any
}) {
    const onChange = useCallback((r: any) => onSelectReferece(r.target.value), [onSelectReferece])

    return (
        <Card bordered={false} size="small" style={{ backgroundColor: 'transparent' }} bodyStyle={{ padding: '4px' }}>
            <div style={{ textAlign: 'center' }}>
                <Text strong>Reference annotations </Text>
                <Radio.Group value={reference} size="small" buttonStyle="solid" onChange={onChange}>
                    <Radio.Button value="none">None</Radio.Button>
                    {_.map(references, (reference, k) => (
                        <Radio.Button
                            key={k}
                            value={reference}
                            disabled={annotations[reference] && annotations[reference].length === 0}
                        >
                            {reference}
                        </Radio.Button>
                    ))}
                </Radio.Group>
            </div>
        </Card>
    )
})
