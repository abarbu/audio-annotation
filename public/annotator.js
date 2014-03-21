
function message(kind, msg) {
    $("#loading").html('<h4><div class="alert alert-' + kind + '">' + msg + '</span></h4>')
        .removeClass('invisible')
}

var parameters = $.url().param();

if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

var id

if(parameters.id == null) {
    message("danger", "Enter your id as a parameter like ?id=<name> at the end of the URL");
    throw "fatal"
}
id = parameters.id

var segments
var annotated

$.ajax({type: 'POST',
        data: JSON.stringify({id: id}),
        contentType: 'application/json',
        async: false,
        url: '/annotations-for-annotator',
        success: function(data) {
            console.log(data.annotated)
            segments = data.segments.sort()
            annotated = _.object(data.annotated,[])
        }})

$.extend( $.tablesorter.defaults, {
    theme: 'dropbox',
    widthFixed: true
});
$("table.options, table.api").tablesorter({widgets:['stickyHeaders']});
$("#segment-table").tablesorter();

_.each(segments,
       function (segment, nr) {
           $('#segment-table > tbody:last')
               .append($('<tr>')
                       .append($('<td>').text(nr))
                       .append($('<td>').append('<a target="_blank" href="/gui.html?segment=' + segment + '&id=' + id +'">' + segment + '</a>'))
                       .append($('<td>').append((segment in annotated?'<span class="text-success">Yes</span>':'<span class="text-muted">No</span>'))))})

$("#segment-table").trigger('update');
