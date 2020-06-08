import React, { useCallback, useState } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import { Divider, Checkbox, Typography, Card, Radio } from 'antd'

const CheckboxGroup = Checkbox.Group
const { Text } = Typography

export default React.memo(function WorkerSelector({
    workers,
    onSelectWorker,
}: {
    workers: string[]
    onSelectWorker: (reference: string) => any
}) {
    const [checkedList, setCheckedList] = useState<string[]>([])
    const [indeterminate, setIndeterminate] = useState(false)

    const onCheckAll = useCallback(() => setCheckedList(prev => (_.isEqual(prev, workers) ? [] : workers)), [
        setCheckedList,
        workers,
    ])
    const onChange = useCallback((r: any) => setCheckedList(r), [onSelectWorker])

    return (
        <Card bordered={false} size="small" style={{ backgroundColor: 'transparent' }} bodyStyle={{ padding: '4px' }}>
            <div>
                <Checkbox indeterminate={checkedList.length > 0 && checkedList.length != workers.length} onClick={onCheckAll}>
                    All
        </Checkbox>
                <Divider type="vertical" />
                <CheckboxGroup options={workers} value={checkedList} onChange={onChange} />
            </div>
        </Card>
    )
})

/* < div >
 * <Text strong>Reference annotations </Text>
 * <Radio.Group value={reference} size="small" buttonStyle="solid" onChange={onChange}>
 *     <Radio.Button value="none">None</Radio.Button>
 *     {_.map(references, (reference, k) => (
 *         <Radio.Button
 *             key={k}
 *             value={reference}
 *             disabled={
 *                 _.isUndefined(annotations) ? false : annotations[reference] && annotations[reference].length === 0
 *             }
 *         >
 *             {reference}
 *         </Radio.Button>
 *     ))}
 * </Radio.Group>
   </div > */

/* onChange={this.onCheckAllChange}
 * checked={this.state.checkAll} */

/* ;
 *      */
