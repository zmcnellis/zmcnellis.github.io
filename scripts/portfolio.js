window.onload = startTime;

function startTime() {
  if ($('.time') == undefined) {
    return;
  }
  var today = new Date();
  var h = today.getHours();
  var timeofday = h >= 12 ? "PM" : "AM"
  h = checkTime(h % 12 || 12);
  var m = today.getMinutes();
  var s = today.getSeconds();
  m = checkTime(m);
  s = checkTime(s);
  document.getElementsByClassName('time')[0].innerHTML = h + ":" + m + " " + timeofday;
  var t = setTimeout(startTime, 500);
}

function checkTime(i) {
  if (i < 10) {i = "0" + i};
  return i;
}

$('.gallery img').on('click', function(event) {
  var description_id_selector = '#' + $(this).attr('alt');

  $('.portfolio_description').each(function() {
    $(this).hide();
  });

  $(description_id_selector).show();
  $(document).scrollTop($(description_id_selector));
});

$('.close-description').on('click', function(event) {
  $('.portfolio_description').each(function() {
    $(this).hide();
  });
});
