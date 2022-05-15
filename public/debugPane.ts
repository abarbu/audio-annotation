function updateUsername(username: string) {
  let p = $.url().param()
  p.worker = username
  window.history.pushState($.url().param(), 'Audio annotation', '/gui.html?' + $.param(p))
  $('#worker-name').val(username)
}

updateUsername($.url().param().worker)

$('#change-user').click(function (e) {
  recordMouseClick(e, '#change-user')
  // @ts-ignore
  updateUsername($('#worker-name').val())
  $('#worker-name').blur()
  reload(null)
})

$('#worker-name').keypress(function (event) {
  if (event.which == 13) {
    event.preventDefault()
    $('#change-user').click()
    $('#worker-name').blur()
  }
})

function updateReferences(references: string[]) {
  let p = $.url().param()
  // TODO This is the old system
  delete p.references
  p.reference = references
  window.history.pushState($.url().param(), 'Audio annotation', '/gui.html?' + _.replace($.param(p, true), /%3A/g, ':'))
  $('#references-input').val(_.join(references, ' '))
}

function currentReferences() {
  return _.concat(
    // TODO Legacy, remove 'references' and keep repeated 'reference'
    _.isUndefined($.url().param().references) ? [] : _.split($.url().param().references, ','),
    _.isUndefined($.url().param().reference) ? [] : $.url().param().reference
  )
}

updateReferences(currentReferences())

$('#edit-references').click(function (e) {
  recordMouseClick(e, '#edit-references')
  // @ts-ignore
  updateReferences(_.split($('#references-input').val(), ' '))
  $('#references-input').blur()
  reload(null)
})

$('#references-input').keypress(function (event) {
  if (event.which == 13) {
    event.preventDefault()
    $('#edit-references').click()
    $('#references-input').blur()
  }
})
