import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import { Typography, Tag, Input, Row, Col, Space, Divider, Card, Button, Radio } from 'antd'
import { batched } from '../Misc'

const { Search } = Input

export default React.memo(function EditorAdvancedButtons({
    movie,
    setMovie,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    user,
    setUser,
    references,
    setReferences,
    defaultReference,
    setDefaultReference,
    onMessage = () => null,
}: {
    movie: string
    setMovie: (a: string) => any
    startTime: Types.TimeInMovie
    setStartTime: (a: Types.TimeInMovie) => any
    endTime: Types.TimeInMovie
    setEndTime: (a: Types.TimeInMovie) => any
    user: string
    setUser: (a: string) => any
    references: string[]
    setReferences: (a: string[]) => any
    defaultReference: string
    setDefaultReference: (a: string) => any
    onMessage?: (level: Types.MessageLevel, value: string) => any
}) {
    const movieRef = useRef<any>()
    useEffect(() => {
        movieRef.current.input.state.value = movie
    }, [movie])

    const startTimeRef = useRef<any>()
    useEffect(() => {
        startTimeRef.current.input.state.value = startTime
    }, [startTime])

    const userRef = useRef<any>()
    useEffect(() => {
        userRef.current.input.state.value = user
    }, [user])

    const referencesRef = useRef<any>()
    useEffect(() => {
        referencesRef.current.input.state.value = _.join(references, ' ')
    }, [references])

    const defaultReferenceRef = useRef<any>()
    useEffect(() => {
        defaultReferenceRef.current.input.state.value = defaultReference
    }, [defaultReference])

    const setReferences_ = useCallback(
        (value: any) => {
            console.log('SETREF', value, _.split(value, ' '))
            setReferences(_.split(value, ' '))
        },
        [setReferences]
    )
    const setPosition_ = useCallback(
        (value: any) => {
            console.log(
                'POS',
                value,
                endTime,
                startTime,
                Types.sub(endTime, startTime),
                Types.from(Types.sub(endTime, startTime)),
                Types.to<Types.TimeInMovie>(value + Types.from(Types.sub(endTime, startTime))),
                Types.to<Types.TimeInMovie>(value)
            )
            batched(() => {
                setEndTime(Types.to<Types.TimeInMovie>(parseInt(value) + Types.from(Types.sub(endTime, startTime))))
                setStartTime(Types.to<Types.TimeInMovie>(value))
            })()
        },
        [setStartTime, setEndTime, startTime, endTime]
    )

    return (
        <Card bordered={false} size="small" style={{ backgroundColor: 'transparent' }} bodyStyle={{ padding: '4px' }}>
            <div style={{ wordWrap: 'break-word', textAlign: 'center' }}>
                <Button type="primary" size="small">
                    Go to last annotation
        </Button>
                <Search
                    style={{ width: '15em', marginBottom: '2px' }}
                    placeholder="position"
                    enterButton="Go to position"
                    size="small"
                    type="number"
                    ref={startTimeRef}
                    defaultValue={Types.from(startTime)}
                    onSearch={setPosition_}
                />
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Search
                    style={{ width: '18em' }}
                    placeholder="user"
                    enterButton="Change user"
                    size="small"
                    ref={userRef}
                    defaultValue={user}
                    onSearch={setUser}
                />
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Search
                    style={{ width: '18em' }}
                    placeholder="movie"
                    enterButton="Change movie"
                    size="small"
                    ref={movieRef}
                    defaultValue={movie}
                    onSearch={setMovie}
                />
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Search
                    style={{ width: '40em' }}
                    placeholder="annotators"
                    enterButton="Change references"
                    size="small"
                    ref={referencesRef}
                    onSearch={setReferences_}
                    defaultValue={_.join(references, ' ')}
                />
                <Divider type="vertical" style={{ borderLeftColor: 'transparent' }} />
                <Search
                    style={{ width: '18em' }}
                    placeholder="user"
                    enterButton="Change default references"
                    size="small"
                    ref={defaultReferenceRef}
                    onSearch={setDefaultReference}
                    defaultValue={defaultReference}
                />
            </div>
        </Card>
    )
})
