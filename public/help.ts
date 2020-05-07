
$('#container-wrapper')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Task')
    .attr(
        'data-bootstro-content',
        "You're going to annotate the beginning and end of each word on this diagram. It's a representation of the audio. Click anyhwere on it to play a chunk of the audio."
    )
    .attr('data-bootstro-placement', 'bottom')
    .attr('data-bootstro-width', '700px')
    .attr('data-bootstro-step', '0')

$('#play')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Play')
    .attr(
        'data-bootstro-content',
        'You can play the entire audio clip with this button. By default the audio plays at half the speed to make annotation easier.'
    )
    .attr('data-bootstro-placement', 'bottom')
    .attr('data-bootstro-step', '1')

$('#toggle-speed-div')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Audio speed')
    .attr(
        'data-bootstro-content',
        'It can be hard to catch each word and when it was said. We play the audio at half speed by default, you can change this to regular speed.'
    )
    .attr('data-bootstro-placement', 'top')
    .attr('data-bootstro-step', '2')

$('#transcript-panel')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Words')
    .attr('data-bootstro-content', 'We try to guess which words might have been said.')
    .attr('data-bootstro-placement', 'top')
    .attr('data-bootstro-step', '3')

$('#edit-transcript')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Transcript')
    .attr('data-bootstro-content', 'Listen to the audio and edit the words. Words may be wrong or missing.')
    .attr('data-bootstro-placement', 'top')
    .attr('data-bootstro-step', '4')

$('#spectrogram')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Selecting')
    .attr(
        'data-bootstro-content',
        'Once you have the words, place the red marker on the diagram. A short audio segment will play.'
    )
    .attr('data-bootstro-placement', 'top')
    .attr('data-bootstro-step', '5')

$('#words')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Words')
    .attr(
        'data-bootstro-content',
        'With the market in position you can choose which word to start at that location. We guess the word length, but you should adjust it.'
    )
    .attr('data-bootstro-placement', 'top')
    .attr('data-bootstro-step', '6')

$('#container')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Adjusting')
    .attr(
        'data-bootstro-content',
        'Drag the start and ends of words. Green words are ones that you annotated. The orange word is the currenctly selected one. If any white words exist, they are references we provide to make life eaiser.'
    )
    .attr('data-bootstro-placement', 'bottom')
    .attr('data-bootstro-step', '7')

$('#d3')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Verifying')
    .attr(
        'data-bootstro-content',
        'You should adjust the word boundaries by dragging them into the correct position on the diagram. The audio will automatically play. You can replay by clicking here or by using the keyboard shortcuts in red.'
    )
    .attr('data-bootstro-placement', 'top')
    .attr('data-bootstro-step', '8')

$('#delete-selection')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Deleting')
    .attr('data-bootstro-content', "If a word isn't relevant or annotated incorrectly you can remove it.")
    .attr('data-bootstro-placement', 'top')
    .attr('data-bootstro-step', '9')

$('#annotations')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'References')
    .attr(
        'data-bootstro-content',
        'Sometimes we have reference annotation available. You can select any references here. This includes any previous work you have done. They appear in white on the audio. Your annotations are in green and your selected annotation is in orange. The white annotations cannot be changed.'
    )
    .attr('data-bootstro-placement', 'top')
    .attr('data-bootstro-step', '10')

$('#replace-reference')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'References')
    .attr(
        'data-bootstro-content',
        'You can replace your annotation with the reference one or use the reference to fill in missing parts of your annotations.'
    )
    .attr('data-bootstro-placement', 'top')
    .attr('data-bootstro-step', '11')

$('#save-and-seek')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Saving while navigating')
    .attr(
        'data-bootstro-content',
        'You will usually annotate and then move on to the next segment. These buttons move you but also save your work each time.'
    )
    .attr('data-bootstro-placement', 'top')
    .attr('data-bootstro-step', '12')

$('#submit-button')
    .addClass('bootstro')
    .attr('data-bootstro-title', 'Submit')
    .attr('data-bootstro-content', 'You can save your work on the current segment by submitting it.') // TODO Update for MTurk
    .attr('data-bootstro-placement', 'bottom')
    .attr('data-bootstro-step', '13')

// TODO This needs a unique location
// $('#submit').addClass('bootstro')
//     .attr('data-bootstro-title', "Submitting")
//     .attr('data-bootstro-content', "Once you're done with all of the words you can click here and we'll give you the token to enter into Amazon interface. It's ok to leave out a word if you can't recognize it, it's too noisy, or if it's not actually there. Thanks for helping us with our research!")
//     .attr('data-bootstro-placement', "bottom")
//     .attr('data-bootstro-step', '6')

$('#intro').click((e) => {
    recordMouseClick(e, '#intro')
    // @ts-ignore
    bootstro.start('.bootstro', {
        finishButton:
            '<button class="btn btn-mini btn-warning bootstro-finish-btn"><i class="icon-ok"></i>Exit tutorial</button>',
    })
})

