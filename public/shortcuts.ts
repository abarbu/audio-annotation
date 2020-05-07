
function keyboardShortcutsOn() {
    $(document).bind('keydown', 'p', () => {
        clear()
        recordKeypress('p')
        $('#play').click()
    })
    $(document).bind('keydown', 't', () => {
        clear()
        recordKeypress('w')
        $('#stop').click()
    })
    $(document).bind('keydown', 'd', () => {
        clear()
        recordKeypress('d')
        $('#delete-selection').click()
    })
    $(document).bind('keydown', 'y', () => {
        clear()
        recordKeypress('y')
        $('#play-selection').click()
    })
    $(document).bind('keydown', 'w', () => {
        clear()
        recordKeypress('w')
        $('#start-next-word').click()
    })
    $(document).bind('keydown', 'shift+w', () => {
        clear()
        recordKeypress('shift+y')
        $('#start-next-word-after-current-word').click()
    })
    $(document).bind('keydown', 'a', () => {
        clear()
        recordKeypress('a')
        $('#toggle-speed').bootstrapSwitch('toggleState')
    })
    $(document).bind('keydown', 'm', () => {
        clear()
        recordKeypress('m')
        $('#toggle-audio').bootstrapSwitch('toggleState')
    })
    $(document).bind('keydown', 'shift+b', () => {
        clear()
        recordKeypress('shift+b')
        $('#back-save-4-sec').click()
    })
    $(document).bind('keydown', 'b', () => {
        clear()
        recordKeypress('b')
        $('#back-save-2-sec').click()
    })
    $(document).bind('keydown', 'f', () => {
        clear()
        recordKeypress('f')
        $('#forward-save-2-sec').click()
    })
    $(document).bind('keydown', 'shift+f', () => {
        clear()
        recordKeypress('shift+f')
        $('#forward-save-4-sec').click()
    })
    $(document).bind('keydown', 's', () => {
        clear()
        recordKeypress('s')
        $('#submit').click()
    })
    $(document).bind('keydown', 'u', () => {
        clear()
        recordKeypress('u')
        $('#fill-with-reference').click()
    })
    $(document).bind('keydown', 't', e => {
        clear()
        recordKeypress('t')
        $('#edit-transcript').click()
        if (selected != null) {
            const n = _.sum(
                _.map(
                    _.filter(annotations, a => a.index < selected!),
                    a => a.word.length + 1
                )
            )
            // @ts-ignore
            $('#transcript-input').focus()[0].setSelectionRange(n, n)
        } else {
            $('#transcript-input').focus()
        }
        e.preventDefault()
    })
    $(document).bind('keydown', 'left', () => {
        clear()
        recordKeypress('left')
        if (selected == null) {
            const lastAnnotation = _.last(_.filter(annotations, isValidAnnotation))
            if (lastAnnotation) {
                selectWord(lastAnnotation)
                $('#play-selection').click()
            } else {
                message('warning', "Can't select the last word: no words are annotated")
                return
            }
        } else {
            const nextAnnotation = _.last(_.filter(_.take(annotations, selected), isValidAnnotation))
            if (nextAnnotation) {
                selectWord(nextAnnotation)
                $('#play-selection').click()
            } else {
                message('warning', 'At the first word, no other annotations to select')
                return
            }
        }
    })
    $(document).bind('keydown', 'right', () => {
        clear()
        recordKeypress('right')
        if (selected == null) {
            const firstAnnotation = _.head(_.filter(annotations, isValidAnnotation))
            if (firstAnnotation) {
                selectWord(firstAnnotation)
                $('#play-selection').click()
            } else {
                message('warning', "Can't select the first word: no words are annotated")
                return
            }
        } else {
            const nextAnnotation = _.head(_.filter(_.drop(annotations, selected + 1), isValidAnnotation))
            if (nextAnnotation) {
                selectWord(nextAnnotation)
                $('#play-selection').click()
            } else {
                message('warning', 'At the last word, no other annotations to select')
                return
            }
        }
    })
    $(document).bind('keydown', 'up', () => {
        clear()
        recordKeypress('up')
        $('#play-selection').click()
    })
    $(document).bind('keydown', 'down', () => {
        clear()
        recordKeypress('down')
        $('#play-selection').click()
    })
    $(document).bind('keydown', 'shift+left', () => {
        clear()
        recordKeypress('shift+left')
        if (selected == null || !isValidAnnotation(annotations[selected])) {
            message('warning', "Can't shift the start of the word earlier; no word is selected.")
            return
        } else {
            annotations[selected].startTime =
                verifyTranscriptOrder(selected,
                    subMax(annotations[selected].startTime!, keyboardShiftOffset, to(startS)))
            updateWord(annotations[selected])
        }
    })
    $(document).bind('keydown', 'shift+right', () => {
        clear()
        recordKeypress('shift+right')
        if (selected == null || !isValidAnnotation(annotations[selected])) {
            message('warning', "Can't shift the start of the word later; no word is selected.")
            return
        } else {
            annotations[selected].startTime = verifyTranscriptOrder(selected, addMin(
                annotations[selected].startTime!,
                keyboardShiftOffset,
                sub(annotations[selected].endTime!, keyboardShiftOffset)))
            updateWord(annotations[selected])
        }
    })
    $(document).bind('keydown', 'ctrl+left', () => {
        clear()
        recordKeypress('ctrl+left')
        if (selected == null || !isValidAnnotation(annotations[selected])) {
            message('warning', "Can't shift the end of the word earlier; no word is selected.")
            return
        } else {
            annotations[selected].endTime = subMax(
                annotations[selected].endTime!,
                keyboardShiftOffset,
                add(annotations[selected].startTime!, keyboardShiftOffset)
            )
            updateWord(annotations[selected])
        }
    })
    $(document).bind('keydown', 'ctrl+right', () => {
        clear()
        recordKeypress('ctrl+right')
        if (selected == null || !isValidAnnotation(annotations[selected])) {
            message('warning', "Can't shift the end of the word later; no word is selected.")
            return
        } else {
            annotations[selected].endTime = addMin(annotations[selected].endTime!, keyboardShiftOffset, to(endS))
            updateWord(annotations[selected])
        }
    })
    $(document).bind('keydown', 'shift+up', () => {
        clear()
        recordKeypress('shift+up')
        if (selected == null || !isValidAnnotation(annotations[selected])) {
            message('warning', "Can't shift the word later; no word is selected.")
            return
        } else {
            annotations[selected].startTime = verifyTranscriptOrder(selected, addMin(
                annotations[selected].startTime!,
                keyboardShiftOffset,
                sub(annotations[selected].endTime!, keyboardShiftOffset)
            ))
            annotations[selected].endTime = addMin(annotations[selected].endTime!, keyboardShiftOffset, to(endS))
            updateWord(annotations[selected])
        }
    })
    $(document).bind('keydown', 'shift+down', () => {
        clear()
        recordKeypress('shift+down')
        if (selected == null || !isValidAnnotation(annotations[selected])) {
            message('warning', "Can't shift the word earlier; no word is selected.")
            return
        } else {
            annotations[selected].startTime = verifyTranscriptOrder(selected,
                subMax(annotations[selected].startTime!, keyboardShiftOffset, to(startS)))
            annotations[selected].endTime = subMax(
                annotations[selected].endTime!,
                keyboardShiftOffset,
                add(annotations[selected].startTime!, keyboardShiftOffset)
            )
            updateWord(annotations[selected])
        }
    })
}
