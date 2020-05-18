import React, { useState, useRef, useEffect, useCallback, MutableRefObject } from 'react'
import * as Types from '../Types'
import _ from 'lodash'
import EditorButtons from '../components/EditorButtons'
import EditorTranscript from '../components/EditorTranscript'
import EditorAdvancedButtons from '../components/EditorAdvancedButtons'
import EditorReferenceSelector from '../components/EditorReferenceSelector'
import { shouldRejectAnnotationUpdate } from '../components/AnnotationLayer'
import { alignWords, batched, usePreviousN, useWhyDidYouUpdate, useEffectDebugger } from '../Misc'
import SpectrogramWithAnnotations from '../components/SpectrogramWithAnnotations'
import { Typography, Tag, Input, Row, Col, Space, Divider, Card, Button, Radio } from 'antd'
import Audio, {
    initialAudioState,
    timeInSegmentToPercentInSegment,
    percentInSegmentToTimeInSegment,
    playAudio,
    playAudioPercent,
    playAudioInMovie,
    stopAudio,
    AudioState
} from '../components/Audio'
import { useHotkeys } from 'react-hotkeys-hook'

const { Text } = Typography

const { Search } = Input

const keyboardShiftOffset: Types.TimeInMovie = Types.to(0.01)

function nextAnnotation(annotations: Types.Annotation[], index: number) {
    var word = _.filter(annotations, function(annotation: Types.Annotation) {
        return annotation.index > index && annotation.startTime != null
    })[0]
    if (word) return word.index
    else return null
}

function previousAnnotation(annotations: Types.Annotation[], index: number): number | null {
    var word = _.last(
        _.filter(annotations, function(annotation: Types.Annotation) {
            return annotation.index < index && annotation.startTime != null
        })
    )
    if (word) return word.index
    else return null
}

export default function EditorUI({
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
    onSave,
    onReload,
    onMessage = () => null
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
    onSave: MutableRefObject<() => any>
    onReload: MutableRefObject<() => any>
    onMessage?: (level: Types.MessageLevel, value: string) => any
}) {
    useWhyDidYouUpdate('EditorUI', {
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
        onSave,
        onReload,
        onMessage
    })

    const [annotations, setAnnotations] = useState<{ [user: string]: Types.Annotation[] }>({})
    const [isLocked, setIsLocked] = useState(false)
    const [selected, setSelected] = useState<null | number>(null)
    /* [] -> no selection, [number] -> click, [start,end] -> region */
    const [clickPosition, setClickPositions] = useState<Types.TimeInSegment[]>([])
    const clearClickMarker = useRef<() => any>(() => null)
    const [topUser, setTopUser] = useState(user)
    const [bottomUser, setBottomUser] = useState(defaultReference)
    const [audioState, setAudioState] = useState<AudioState>(initialAudioState)
    const transcriptButtonRef = useRef<HTMLElement>(null)

    const clearMessages = useCallback(() => onMessage(Types.MessageLevel.closed, ''), [onMessage])

    useEffectDebugger(() => setTopUser(user), [user])

    const isDoingIO = useRef(false)

    const previousLocation = usePreviousN(movie, startTime, endTime, user, references)

    console.log('REDRAW')

    const load = useCallback((forceLoad: boolean = false) => {
        console.log('L', isDoingIO.current, !forceLoad, isDoingIO.current && !forceLoad)
        if (isDoingIO.current && !forceLoad) return;
        isDoingIO.current = true;
        console.log('LOAD', [movie, startTime, endTime, user, references])
        onMessage(Types.MessageLevel.info, 'Loading...')
        fetch(
            // TODO The -4 makes sure we see annotations that fall into our segment.
            `http://localhost:4001/api/annotations?movieName=${encodeURIComponent(movie)}&startS=${encodeURIComponent(
                Types.from(startTime) - 4
            )}&endS=${encodeURIComponent(Types.from(endTime))}&${_.join(
                _.map(_.concat(references, user), (w: string) => 'workers=' + encodeURIComponent(w)),
                '&'
            )}`,
            {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )
            .then(response => response.json())
            .then(result => {
                _.forEach(result.allAnnotations, as => _.forEach(as, (a, key) => a.index = key))
                setAnnotations(_.mapValues(result.allAnnotations,
                    /* TODO Check this */
                    as => _.filter(as, a => !Types.isValidAnnotation(a) || Types.from(a.endTime!) > startTime)))
                setSelected(null)
                onMessage(Types.MessageLevel.success, 'Loaded segment')
                isDoingIO.current = false
            })
            .catch(error => {
                onMessage(Types.MessageLevel.error, 'Failed to load segment! Please report to abarbu@csail.mit.edu')
                console.log(error)
                isDoingIO.current = false
            })
    }, [movie, startTime, endTime, user, _.join(references, ',')])

    useEffectDebugger(() => {
        onReload.current = load
    }, [load])

    const save = useCallback((loadAfter: boolean = false) => {
        console.log('SAVE', isDoingIO.current)
        if (isDoingIO.current) return;
        isDoingIO.current = true;
        console.log('SAVE PREV ', previousLocation)
        console.log('SAVE ANN ', annotations)
        onMessage(Types.MessageLevel.info, 'Saving...')
        const data = {
            segment: previousLocation[0] + ':' + Types.from(previousLocation[1]) + ':' + Types.from(previousLocation[2]),
            browser: navigator.userAgent.toString(),
            windowWidth: window.innerWidth,
            windowHeight: window.outerWidth,
            words: _.map(annotations[topUser], a => a.word),
            selected: selected,
            movie: previousLocation[0],
            start: Types.from(previousLocation[1]),
            end: Types.from(previousLocation[2]),
            startTime: Types.from(previousLocation[1]),
            lastClick: clickPosition,
            worker: topUser,
            user: topUser,
            annotations: _.map(
                _.filter(annotations[topUser], a => Types.isValidAnnotation(a)),
                function(a) {
                    return {
                        startTime: a.startTime!,
                        endTime: a.endTime!,
                        index: a.index,
                        word: a.word
                    }
                }),
        }
        console.log('Sending', data)
        fetch(
            // TODO The -4 makes sure we see annotations that fall into our segment.
            'http://localhost:4001/api/submission',
            {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            }
        )
            .then(response => response.json())
            .then(result => {
                console.log(result)
                onMessage(Types.MessageLevel.success, 'Saved segment')
                if (loadAfter)
                    load(true)
                else
                    isDoingIO.current = false
            })
            .catch(error => {
                onMessage(Types.MessageLevel.error, 'Failed to save segment! Please report to abarbu@csail.mit.edu')
                /* TODO provide debugging info for all errors! */
                console.log(error)
                isDoingIO.current = false
            })
    }, [movie, startTime, endTime, user, _.join(references, ','), annotations])

    useEffectDebugger(() => {
        onSave.current = save
    }, [save])

    useEffectDebugger(() => {
        /* Avoids saves on reload */
        if (!_.isEqual(previousLocation, [movie, startTime, endTime, user, references])) {
            save(true)
        } else {
            load()
        }
    }, [movie, startTime, endTime, user, _.join(references, ',')])

    const setTopAnnotations = useCallback(
        (fn: (prev: Types.Annotation[]) => Types.Annotation[]) => {
            clearMessages()
            setAnnotations(prev => ({ ...prev, [topUser]: fn(prev[topUser]) }))
        },
        [topUser, annotations]
    )

    const addWord = useCallback((missingWord: Types.Annotation | undefined) => {
        clearMessages()
        if (clickPosition.length > 0) {
            const start = Types.timeInSegmentToTimeInMovie(clickPosition[0], startTime)
            const lastIndex = _.findLastIndex(annotations[topUser], a => Types.isValidAnnotation(a) && Types.from(a.startTime!) < Types.from(start))
            if (_.isUndefined(missingWord))
                missingWord = _.head(_.filter(_.drop(annotations[topUser], lastIndex), a => !Types.isValidAnnotation(a)))
            if (!_.isUndefined(missingWord)) {
                setAnnotations(prev => {
                    let anns = _.cloneDeep(prev[topUser])
                    anns[missingWord!.index].startTime = Types.timeInSegmentToTimeInMovie(clickPosition[0], startTime)
                    if (clickPosition.length == 2) {
                        anns[missingWord!.index].endTime = Types.timeInSegmentToTimeInMovie(clickPosition[1], startTime)
                    } else {
                        anns[missingWord!.index].endTime = Types.lift(start, p => Math.min(p + anns[missingWord!.index].word.length * 0.05, Types.from(endTime)))
                    }
                    setSelected(missingWord!.index)
                    clearClickMarker.current()
                    setClickPositions([])
                    return ({
                        ...prev, [topUser]:
                            Types.verifyTranscriptOrder(prev[topUser],
                                anns,
                                onMessage,
                                missingWord!.index,
                                Types.timeInSegmentToTimeInMovie(clickPosition[0], startTime))
                    })
                })
            } else {
                /* TODO feedback */
            }
        } else {
            let selectedIdx = null as null | number
            if (!_.isNull(selected) && selected >= 0) {
                selectedIdx = selected
            } else {
                selectedIdx = _.findLastIndex(annotations[topUser], a => Types.isValidAnnotation(a))
            }
            if (!_.isNull(selectedIdx) && selectedIdx >= 0) {
                setAnnotations(prev => {
                    let anns = _.cloneDeep(prev[topUser])
                    if (_.isUndefined(missingWord))
                        missingWord = _.head(_.filter(_.drop(annotations[topUser], annotations[topUser][selectedIdx!].index), a => !Types.isValidAnnotation(a)))
                    if (!_.isUndefined(missingWord)) {
                        anns[missingWord!.index].startTime = annotations[topUser][selectedIdx!].endTime
                        anns[missingWord!.index].endTime = Types.lift(annotations[topUser][selectedIdx!].endTime!,
                            p => Math.min(p + anns[missingWord!.index].word.length * 0.05, Types.from(endTime)))
                        setSelected(missingWord!.index)
                        clearClickMarker.current()
                        setClickPositions([])
                        return ({
                            ...prev, [topUser]:
                                Types.verifyTranscriptOrder(prev[topUser],
                                    anns,
                                    onMessage,
                                    missingWord!.index,
                                    annotations[topUser][selectedIdx!].endTime!)
                        })
                    } else {
                        /* TODO feedback */
                        return prev
                    }
                })
            } else {
                /* TODO feedback */
            }
        }
    }, [clickPosition, setClickPositions, selected])

    const onWordSelected = useCallback((index: number | null, ann: Types.Annotation | null) => {
        clearMessages()
        if (!_.isNull(ann) && !_.isUndefined(ann.startTime)) {
            clearClickMarker.current()
            setSelected(index)
            if (_.isNull(index) || _.isNull(ann) || _.isUndefined(ann.startTime) || _.isUndefined(ann.endTime)) {
                stopAudio(setAudioState)
            } else {
                playAudioInMovie(ann.startTime, ann.endTime, setAudioState, startTime)
            }
        } else {
            console.log('Not selected!', clickPosition)
            if (!_.isNull(ann))
                addWord(ann)
            clearClickMarker.current()
        }
    }, [clearClickMarker, clickPosition, setClickPositions, selected])

    const onStartNextWord = useCallback(() => {
        clearMessages()
        addWord(undefined)
    }, [clickPosition, setClickPositions, selected])

    const onStartWordAfterWord = useCallback(() => {
        clearMessages()
        let firstMissingWord: Types.Annotation | undefined
        let selectedIdx = null as null | number
        if (!_.isNull(selected) && selected >= 0) {
            selectedIdx = selected
        } else {
            selectedIdx = _.findLastIndex(annotations[topUser], a => Types.isValidAnnotation(a))
        }
        if (!_.isNull(selectedIdx) && selectedIdx >= 0) {
            setAnnotations(prev => {
                let anns = _.cloneDeep(prev[topUser])
                firstMissingWord = _.head(_.filter(_.drop(annotations[topUser], annotations[topUser][selectedIdx!].index), a => !Types.isValidAnnotation(a)))
                if (!_.isUndefined(firstMissingWord)) {
                    anns[firstMissingWord!.index].startTime = annotations[topUser][selectedIdx!].endTime
                    anns[firstMissingWord!.index].endTime = Types.lift(annotations[topUser][selectedIdx!].endTime!,
                        p => Math.min(p + anns[firstMissingWord!.index].word.length * 0.05, Types.from(endTime)))
                    setSelected(firstMissingWord!.index)
                    clearClickMarker.current()
                    console.log('clear3')
                    setClickPositions([])
                    return ({ ...prev, [topUser]: anns })
                } else {
                    /* TODO feedback */
                    return prev
                }
            })
        } else {
            /* TODO feedback */
        }
    }, [selected])

    const onPlayIndex = useCallback((index) => {
        clearMessages()
        if (!_.isNull(index) && Types.isValidAnnotation(annotations[topUser][index])) {
            const ann = annotations[topUser][index]
            playAudioInMovie(ann.startTime!, ann.endTime!, setAudioState, startTime)
        }
    }, [selected, annotations, topUser])

    const onBack4s = useCallback(() => {
        clearMessages()
        setBottomUser(defaultReference)
        setStartTime(Types.addConst(startTime, -4))
        setEndTime(Types.addConst(endTime, -4))
    }, [startTime, endTime, defaultReference, setBottomUser])
    const onBack2s = useCallback(() => {
        clearMessages()
        setBottomUser(defaultReference)
        setStartTime(Types.addConst(startTime, -2))
        setEndTime(Types.addConst(endTime, -2))
    }, [startTime, endTime, defaultReference, setBottomUser])
    const onForward2s = useCallback(() => {
        clearMessages()
        setBottomUser(defaultReference)
        setStartTime(Types.addConst(startTime, 2))
        setEndTime(Types.addConst(endTime, 2))
    }, [startTime, endTime, defaultReference, setBottomUser])
    const onForward4s = useCallback(() => {
        clearMessages()
        setBottomUser(defaultReference)
        setStartTime(Types.addConst(startTime, 4))
        setEndTime(Types.addConst(endTime, 4))
    }, [startTime, endTime, defaultReference, setBottomUser])
    const onPlayFromBeginning = useCallback(() => {
        clearMessages()
        playAudio(Types.to(0), null, setAudioState)
    }, [setAudioState])
    const onStop = useCallback(() => {
        clearMessages()
        stopAudio(setAudioState)
    }, [setAudioState])
    const onPlaySelection = useCallback(() => {
        clearMessages()
        if (!_.isNull(selected) && Types.isValidAnnotation(annotations[topUser][selected])) {
            const ann = annotations[topUser][selected]
            playAudioInMovie(ann.startTime!, ann.endTime!, setAudioState, startTime)
        }
    }, [selected, annotations, topUser])
    const onReplaceWithReference = useCallback(
        () => {
            clearMessages()
            onStop()
            setAnnotations(prev =>
                ({ ...prev, [topUser]: prev[bottomUser] })
            )
        },
        [setAnnotations, onStop]
    )
    const onFillWithReference = useCallback(
        () => {
            clearMessages()
            onStop()
            setAnnotations(prev => {
                const onlyValid = _.filter(prev[topUser], Types.isValidAnnotation)
                const lastAnnotationEndTime = Types.to<Types.TimeInMovie>(
                    _.max(
                        _.concat(
                            -1,
                            _.map(onlyValid, a => Types.from<Types.TimeInMovie>(a.endTime!))
                        )
                    )!
                )
                let mergedAnnotations = _.cloneDeep(_.concat(
                    onlyValid,
                    // @ts-ignore
                    _.filter(prev[bottomUser], (a: Types.Annotation) => a.startTime > lastAnnotationEndTime)
                ))
                _.forEach(mergedAnnotations, (a, k: number) => { a.index = k })
                return ({ ...prev, [topUser]: mergedAnnotations })
            })
        },
        [setAnnotations, onStop]
    )
    const onDeleteSelection = useCallback(
        () => {
            clearMessages()
            if (!_.isNull(selected)) {
                onStop()
                setAnnotations(prev => {
                    const previous = previousAnnotation(prev[topUser], selected)
                    const next = nextAnnotation(prev[topUser], selected)
                    if (previous != null) setSelected(previous)
                    else if (next != null) setSelected(next)
                    else setSelected(null)
                    let anns = _.cloneDeep(prev[topUser])
                    anns[selected].startTime = undefined
                    anns[selected].endTime = undefined
                    return ({ ...prev, [topUser]: anns })
                })
            }
        },
        [setAnnotations, onStop, selected]
    )

    const onUnselect = useCallback(() => {
        clearMessages()
        setSelected(null)
    }, [selected])

    const onUpdateTranscript = useCallback(
        (newWords: string[]) => {
            clearMessages()
            setSelected(null)
            setAnnotations(prev => {
                const oldWords = _.map(prev[topUser], a => a.word)
                const oldAnnotations = _.cloneDeep(prev[topUser])
                const alignment = alignWords(newWords, oldWords)
                let annotations: Types.Annotation[] = []
                _.forEach(newWords, function(word, index) {
                    annotations[index] = { word: word, index: index }
                    if (_.has(alignment, index)) {
                        const old = oldAnnotations[alignment[index]]
                        annotations[index].startTime = old.startTime
                        annotations[index].endTime = old.endTime
                        annotations[index].lastClickTimestamp = old.lastClickTimestamp
                    } else if (oldWords.length == newWords.length) {
                        // If there is no alignment but the number of words is unchanged, then
                        // we replaced one or more words. We preserve the annotations in that
                        // case.
                        const old = oldAnnotations[index]
                        annotations[index].startTime = old.startTime
                        annotations[index].endTime = old.endTime
                        annotations[index].lastClickTimestamp = old.lastClickTimestamp
                    }
                })
                return ({ ...prev, [topUser]: annotations })
            })
        }, [annotations])

    const setClickPositionsFn = useCallback((val: React.SetStateAction<Types.TimeInSegment[]>, clear: boolean) => {
        clearMessages()
        setClickPositions(val)
        if (val.length !== 0 && clear) setSelected(null)
    }, [])

    const onSelectReferece = useCallback((reference: string) => {
        setBottomUser(reference)
    }, [setBottomUser])

    useHotkeys('shift+b', batched(onBack4s), {}, [onBack4s])
    useHotkeys('b', batched(onBack2s), {}, [onBack2s])
    useHotkeys('f', batched(onForward2s), {}, [onForward2s])
    useHotkeys('shift+f', batched(onForward4s), {}, [onForward4s])
    useHotkeys('p', batched(onPlayFromBeginning), {}, [onPlayFromBeginning])
    useHotkeys('t', batched(onStop), {}, [onStop])
    useHotkeys('up', batched(onPlaySelection), {}, [onPlaySelection])
    useHotkeys('down', batched(onPlaySelection), {}, [onPlaySelection])
    useHotkeys('y', batched(onPlaySelection), {}, [onPlaySelection])
    useHotkeys('c', batched(onUnselect), {}, [onUnselect])
    useHotkeys('d', batched(onDeleteSelection), {}, [onDeleteSelection])
    useHotkeys('w', batched(onStartNextWord), {}, [onStartNextWord])
    useHotkeys('shift+w', batched(onStartWordAfterWord), {}, [onStartWordAfterWord])
    useHotkeys('right', () => {
        clearMessages()
        if (selected == null) {
            const firstAnnotation = _.head(_.filter(annotations[topUser], Types.isValidAnnotation))
            if (firstAnnotation) {
                setSelected(firstAnnotation.index)
                onPlayIndex(firstAnnotation.index)
            } else {
                onMessage(Types.MessageLevel.warning, "Can't select the first word: no words are annotated")
                return
            }
        } else {
            const nextAnnotation = _.head(_.filter(_.drop(annotations[topUser], selected + 1), Types.isValidAnnotation))
            if (nextAnnotation) {
                setSelected(nextAnnotation.index)
                onPlayIndex(nextAnnotation.index)
            } else {
                onMessage(Types.MessageLevel.warning, 'At the last word, no other annotations to select')
                return
            }
        }
    }, {}, [selected, setSelected, annotations])
    useHotkeys('left', () => {
        clearMessages()
        if (selected == null) {
            const firstAnnotation = _.last(_.filter(annotations[topUser], Types.isValidAnnotation))
            if (firstAnnotation) {
                setSelected(firstAnnotation.index)
                onPlayIndex(firstAnnotation.index)
            } else {
                onMessage(Types.MessageLevel.warning, "Can't select the last word: no words are annotated")
                return
            }
        } else {
            const nextAnnotation = _.last(_.filter(_.take(annotations[topUser], selected), Types.isValidAnnotation))
            if (nextAnnotation) {
                setSelected(nextAnnotation.index)
                onPlayIndex(nextAnnotation.index)
            } else {
                onMessage(Types.MessageLevel.warning, 'At the first word, no other annotations to select')
                return
            }
        }
    }, {}, [selected, setSelected, annotations])
    useHotkeys('t', () => {
        if (transcriptButtonRef.current)
            transcriptButtonRef.current.click()
    }, {}, [onBack4s])

    useHotkeys('shift+left', () => {
        if (selected == null) {
            onMessage(Types.MessageLevel.warning, "Can't move word beginning, no word selected")
        } else if (!Types.isValidAnnotation(annotations[topUser][selected])) {
            onMessage(Types.MessageLevel.warning, "The current word is not annotated")
        } else {
            let anns = _.cloneDeep(annotations[topUser])
            anns[selected].startTime = Types.subMax(anns[selected].startTime!, keyboardShiftOffset, startTime)
            if (!shouldRejectAnnotationUpdate(anns, anns[selected])) {
                setAnnotations(prev => ({ ...prev, [topUser]: anns }))
            }
        }
    }, {}, [selected, topUser, annotations])
    useHotkeys('shift+right', () => {
        if (selected == null) {
            onMessage(Types.MessageLevel.warning, "Can't move word beginning, no word selected")
        } else if (!Types.isValidAnnotation(annotations[topUser][selected])) {
            onMessage(Types.MessageLevel.warning, "The current word is not annotated")
        } else {
            let anns = _.cloneDeep(annotations[topUser])
            anns[selected].startTime = Types.addMin(anns[selected].startTime!,
                keyboardShiftOffset,
                Types.sub(anns[selected].endTime!, keyboardShiftOffset))
            if (!shouldRejectAnnotationUpdate(anns, anns[selected])) {
                setAnnotations(prev => ({ ...prev, [topUser]: anns }))
            }
        }
    }, {}, [selected, topUser, annotations])

    useHotkeys('ctrl+left', () => {
        if (selected == null) {
            onMessage(Types.MessageLevel.warning, "Can't move word beginning, no word selected")
        } else if (!Types.isValidAnnotation(annotations[topUser][selected])) {
            onMessage(Types.MessageLevel.warning, "The current word is not annotated")
        } else {
            let anns = _.cloneDeep(annotations[topUser])
            anns[selected].endTime = Types.subMax(anns[selected].endTime!,
                keyboardShiftOffset,
                Types.add(anns[selected].startTime!, keyboardShiftOffset))
            if (!shouldRejectAnnotationUpdate(anns, anns[selected])) {
                setAnnotations(prev => ({ ...prev, [topUser]: anns }))
            }
        }
    }, {}, [selected, topUser, annotations])
    useHotkeys('ctrl+right', () => {
        if (selected == null) {
            onMessage(Types.MessageLevel.warning, "Can't move word beginning, no word selected")
        } else if (!Types.isValidAnnotation(annotations[topUser][selected])) {
            onMessage(Types.MessageLevel.warning, "The current word is not annotated")
        } else {
            let anns = _.cloneDeep(annotations[topUser])
            anns[selected].endTime = Types.addMin(anns[selected].endTime!, keyboardShiftOffset, endTime)
            if (!shouldRejectAnnotationUpdate(anns, anns[selected])) {
                setAnnotations(prev => ({ ...prev, [topUser]: anns }))
            }
        }
    }, {}, [selected, topUser, annotations])

    useHotkeys('shift+up', () => {
        if (selected == null) {
            onMessage(Types.MessageLevel.warning, "Can't move word beginning, no word selected")
        } else if (!Types.isValidAnnotation(annotations[topUser][selected])) {
            onMessage(Types.MessageLevel.warning, "The current word is not annotated")
        } else {
            let anns = _.cloneDeep(annotations[topUser])
            anns[selected].startTime = Types.subMax(anns[selected].startTime!, keyboardShiftOffset, startTime)
            anns[selected].endTime = Types.subMax(anns[selected].endTime!,
                keyboardShiftOffset,
                Types.add(anns[selected].startTime!, keyboardShiftOffset))
            if (!shouldRejectAnnotationUpdate(anns, anns[selected])) {
                setAnnotations(prev => ({ ...prev, [topUser]: anns }))
            }
        }
    }, {}, [selected, topUser, annotations])
    useHotkeys('shift+down', () => {
        if (selected == null) {
            onMessage(Types.MessageLevel.warning, "Can't move word beginning, no word selected")
        } else if (!Types.isValidAnnotation(annotations[topUser][selected])) {
            onMessage(Types.MessageLevel.warning, "The current word is not annotated")
        } else {
            let anns = _.cloneDeep(annotations[topUser])
            anns[selected].startTime = Types.addMin(anns[selected].startTime!,
                keyboardShiftOffset,
                Types.sub(anns[selected].endTime!, keyboardShiftOffset))
            anns[selected].endTime = Types.addMin(anns[selected].endTime!, keyboardShiftOffset, endTime)
            if (!shouldRejectAnnotationUpdate(anns, anns[selected])) {
                setAnnotations(prev => ({ ...prev, [topUser]: anns }))
            }
        }
    }, {}, [selected, topUser, annotations])

    return (
        <>
            <SpectrogramWithAnnotations
                movie={movie}
                startTime={startTime}
                endTime={endTime}
                topAnnotations={annotations[topUser]}
                setTopAnnotations={setTopAnnotations}
                bottomAnnotations={annotations[bottomUser]}
                setBottomAnnotations={null}
                setSelectedTop={setSelected}
                selectedTop={selected}
                audioState={audioState}
                setAudioState={setAudioState}
                setClickPositions={setClickPositionsFn}
                clearClickMarker={clearClickMarker}
            />

            <EditorButtons
                onPlayFromBeginning={onPlayFromBeginning}
                onStop={onStop}
                onBack4s={onBack4s}
                onBack2s={onBack2s}
                onForward2s={onForward2s}
                onForward4s={onForward4s}
                onPlaySelection={onPlaySelection}
                onReplaceWithReference={onReplaceWithReference}
                onFillWithReference={onFillWithReference}
                onDeleteSelection={onDeleteSelection}
                onUnselect={onUnselect}
                onStartNextWord={onStartNextWord}
                onStartWordAfterWord={onStartWordAfterWord}
            />

            <EditorTranscript
                annotations={annotations[user]}
                selected={selected}
                setSelected={onWordSelected}
                setIsLocked={setIsLocked}
                onUpdateTranscript={onUpdateTranscript}
                ref={transcriptButtonRef}
            />

            <EditorReferenceSelector
                annotations={annotations}
                references={references}
                onSelectReferece={onSelectReferece}
                reference={bottomUser}
            />

            <EditorAdvancedButtons
                movie={movie}
                setMovie={setMovie}
                startTime={startTime}
                setStartTime={setStartTime}
                endTime={endTime}
                setEndTime={setEndTime}
                user={user}
                setUser={setUser}
                references={references}
                setReferences={setReferences}
                defaultReference={defaultReference}
                setDefaultReference={setDefaultReference}
                onMessage={onMessage}
            />
        </>
    )
}

