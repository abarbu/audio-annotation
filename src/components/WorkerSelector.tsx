import React, { useCallback, useState, useEffect } from 'react'
import _ from 'lodash'
import { Divider, Checkbox, Typography, Card, Radio } from 'antd'

const CheckboxGroup = Checkbox.Group
const { Text } = Typography

export default React.memo(function WorkerSelector({
    workers,
    onSelectWorker,
}: {
    workers: string[] | null
    onSelectWorker: (arg: string[]) => any
}) {
    const [checkedList, setCheckedList] = useState<string[] | null>(workers)

    useEffect(() => {
        setCheckedList(workers)
    }, [workers])

    useEffect(() => onSelectWorker(checkedList ? checkedList : []), [checkedList])

    const onChange = useCallback((r: any) => setCheckedList(r), [onSelectWorker])

    const onCheckAll = useCallback(() => {
        setCheckedList(prev => (_.isEqual(prev, workers) ? [] : workers))
    }, [setCheckedList, workers, onSelectWorker])

    return (
        <Card bordered={false} size="small" style={{ backgroundColor: 'transparent' }} bodyStyle={{ padding: '4px' }}>
            <div>
                <Checkbox
                    indeterminate={
                        workers && checkedList ? checkedList.length > 0 && checkedList.length != workers.length : false
                    }
                    onClick={onCheckAll}
                    checked={workers && checkedList ? workers.length === checkedList.length : false}
                >
                    All
        </Checkbox>
                <Divider type="vertical" />
                <CheckboxGroup options={workers ? workers : []} value={checkedList ? checkedList : []} onChange={onChange} />
            </div>
        </Card>
    )
})
