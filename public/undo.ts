
function pushUndo(annotation: Annotation) {
    lastChangedAnnotations.push(_.clone(annotation))
}

function popUndo() {
    const last = _.last(lastChangedAnnotations)
    lastChangedAnnotations = lastChangedAnnotations.slice(0, -1)
    return last
}

function clearUndo() {
    lastChangedAnnotations = []
}

function undo() {
    if (lastChangedAnnotations != []) {
        const ann = popUndo()!
        annotations[ann.index].startTime = ann.startTime
        annotations[ann.index].endTime = ann.endTime
        //updateWord(annotations[ann.index])
    } else {
        message('warning', 'Nothing to undo')
    }
}
