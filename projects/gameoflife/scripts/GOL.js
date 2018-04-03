var imageData = {};
var paintmode = 'PAINT_LIFE';

// main
$(document).ready(function() {
  var running = false;
  var speed = 1.0;
  var interval;
  
  var manager = new Manager();
  var canvas = $('#canvas')[0];
  var context = canvas.getContext('2d');

  imageData = context.getImageData(0, 0, 500, 500);
  manager.init();
  running = true;

  var isPressed = false;
  var x = 0, y = 0;
  $("#canvas").on({
    mousedown: function() {
      isPressed = true;
      x = event.pageX - $('#canvas').offset().left;
      y = event.pageY - $('#canvas').offset().top;
      manager.dabSomePaint(parseInt(x), 500-parseInt(y));
    },
    mouseup: function() {
      isPressed = false;
    },
    mousemove: function() {
      if (isPressed) {
        x = event.pageX - $('#canvas').offset().left;
        y = event.pageY - $('#canvas').offset().top;
        manager.dabSomePaint(parseInt(x), 500-parseInt(y));
      }
    }
  });

  $('#clear').on('click', function() { manager.resetDrawing(false); });
  $('#pause').on('click', function() { 
    if (running)
      $(this).text("Play"); 
    else
      $(this).text("Pause"); 
    running = !running;
  });
  $('input[type=radio][name=brush]').change(function() {
    if (this.value == "life") {
      paintmode = 'PAINT_LIFE';
    }
    else {
      paintmode = 'PAINT_DEATH';
    }
  });
  $('input[name=speed]').change(function() {
    speed = $(this).val() / 100.0;
    clearInterval(interval);
    var ONE_TIME_FRAME = 1000.0 / 60.0 / speed;
    interval = setInterval(animation_step, ONE_TIME_FRAME);
  });

  var animation_step = function() {
    if (running) {
      manager.propagate();
      manager.display();
    }
  }

  var ONE_TIME_FRAME = 1000.0 / 60.0 / speed;
  interval = setInterval(animation_step, ONE_TIME_FRAME);
});

// Manager class
var Manager = function() {
  var display_map = [];

  this.resetDrawing = function() {
    console.log("in Manager::resetDrawing");

    var size = 500*500;
    for (var i = 0; i < size; i++) {
      var val = Math.round(Math.random());
      display_map[i] = val;
    }
  };

  this.index = function(i, j) {
    return i+500*j;
  };

  this.init = function() {
    console.log("in Manager::init");
    var size = 500*500;
    display_map = new Array(size);

    // generate new random board
    this.resetDrawing();
  };

  this.propagate = function() {
    var new_map = [];

    for (var i = 0; i < display_map.length; i++) {
      new_map[i] = display_map[i];
    }

    for (var i=1; i<500-1; i++) {
      for (var j=1; j<500-1; j++) {
        var neighbors = 0;

        for (var x = -1; x <= 1; x++) {
          for (var y = -1; y <= 1; y++) {
            neighbors += display_map[this.index(i+x, j+y)];
          }
        }
        neighbors -= display_map[this.index(i, j)];
        
        new_map[this.index(i, j)] = (neighbors >= 4 || neighbors <= 1) ? 0 : (neighbors == 3 ? 1 : display_map[this.index(i, j)]);
      }
    }

    display_map = new_map;
  };

  this.dabSomePaint = function(x, y) {
    console.log("in Manager::dabSomePaint");
    var brush_width = 10;
    var xstart = parseInt(x - brush_width);
    var ystart = parseInt(y - brush_width);
    if (xstart < 0) { xstart = 0; }
    if (ystart < 0) { ystart = 0; }

    var xend = x + brush_width;
    var yend = y + brush_width;
    if (xend >= 500) { xend = 500-1; }
    if (yend >= 500) { yend = 500-1; }

    if (paintmode == 'PAINT_DEATH') {
      for (var ix=xstart; ix <= xend; ix++) {
        for (var iy=ystart; iy <= yend; iy++) {
          var index = ix + 500*(500-iy);

          display_map[index] = 0;
        }
      }
    }
    else if (paintmode == 'PAINT_LIFE') {
      for (var ix=xstart; ix <= xend; ix++) {
        for (var iy=ystart; iy <= yend; iy++) {
          var index = ix + 500*(500-iy);

          display_map[index] = 1;
        }
      }
    }
  };

  this.display = function() {
    // console.log("in Manager::display");
    var canvas = $('#canvas')[0];
    var context = canvas.getContext('2d');

    var j = 0;
    for (var i = 0; i < imageData.data.length; i += 4) {
      // red
      imageData.data[i] = Math.abs(display_map[j] - 1) * 255.0;

      // green
      imageData.data[i+1] = Math.abs(display_map[j] - 1) * 255.0;

      // blue
      imageData.data[i+2] = Math.abs(display_map[j] - 1) * 255.0;
      
      // alpha
      imageData.data[i+3] = 255;

      j++;
    }

    context.clearRect(0, 0, 500, 500);
    context.putImageData(imageData, 0, 0);
  };
};
