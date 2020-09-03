"use strict";

// Midpoint Displacement class
var MidpointDisplacement = function() {
  var display_map = [];

  this.resetDrawing = function(hasSeed = false) {
    console.log("in MidpointDisplacement::resetDrawing");

    var size = 513*513;
    var step_size = 513 - 1;

    for (var i = 0; i < size; i++) {
      display_map[i] = 0.0;
    }

    if (!hasSeed) {
      var seed = Math.floor(Math.random() * 1000000000);
      Math.seedrandom(seed.toString());
      $('input[name=seed]').val(seed);
    }

    display_map[this.index(0, 0)] = this.get_random(1, false);
    display_map[this.index(512, 0)] = this.get_random(1, false);
    display_map[this.index(0, 512)] = this.get_random(1, false);
    display_map[this.index(512, 512)] = this.get_random(1, false);
  };

  this.index = function(i, j) {
    if (i < 0) {
      i += 513;
    }
    if (j < 0) {
      j += 513;
    }
    return (i%513)+513*(j%513);
  };

  this.init = function() {
    console.log("in MidpointDisplacement::init");
    var size = 513*513;
    display_map = new Array(size);

    // generate new random board
    this.resetDrawing(false);
  };

  this.propagate = function() {
    var step_size = 513 - 1;
    var random_scale = 1.0;

    while (step_size > 1) {
      for (var i=0; i<513-1; i+=step_size) {
        for (var j=0; j<513-1; j+=step_size) {
          this.midpointDisplacement(i, j, step_size, random_scale);
        }
      }

      step_size /= 2;
      random_scale /= 2;
    }
  };

  this.midpointDisplacement = function(i, j, step_size, random_scale) {
    var avg_top = (display_map[this.index(i, j)] + display_map[this.index(i + step_size, j)]) / 2.0;
    var avg_left = (display_map[this.index(i, j)] + display_map[this.index(i, j + step_size)]) / 2.0;
    var avg_right = (display_map[this.index(i + step_size, j)] + display_map[this.index(i + step_size, j + step_size)]) / 2.0;
    var avg_bottom = (display_map[this.index(i, j + step_size)] + display_map[this.index(i + step_size, j + step_size)]) / 2.0;

    display_map[this.index(i + step_size/2, j)] = avg_top + this.get_random(random_scale);
    display_map[this.index(i, j + step_size/2)] = avg_left + this.get_random(random_scale);
    display_map[this.index(i + step_size, j + step_size/2)] = avg_right + this.get_random(random_scale);
    display_map[this.index(i + step_size/2, j + step_size)] = avg_bottom + this.get_random(random_scale);

    var avg = (
      avg_top +
      avg_left +
      avg_right +
      avg_bottom
    ) / 4.0;

    display_map[this.index(i + step_size/2, j + step_size/2)] = avg + this.get_random(random_scale);
  }

  this.get_random = function(scale, allowNegatives = true) {
    if (allowNegatives === true) {
      return (Math.random() >= 0.5) ? Math.random() * scale : Math.random() * -1 * scale;
    }
    else {
      return Math.random() * scale;
    }
  };

  this.display = function() {
    // console.log("in MidpointDisplacement::display");
    var canvas = $('#canvas')[0];
    var context = canvas.getContext('2d');

    var j = 0;
    for (var i = 0; i < imageData.data.length; i += 4) {
      var val = display_map[j];

      if (val <= 0.71) {
        // red
        imageData.data[i] = 50.0;

        // green
        imageData.data[i+1] = 50.0;

        // blue
        imageData.data[i+2] = val * 255.0;
        
        // alpha
        imageData.data[i+3] = 255;
      }
      else {
        // red
        imageData.data[i] = 10.0;

        // green
        imageData.data[i+1] = val * 255.0;

        // blue
        imageData.data[i+2] = 50.0;
        
        // alpha
        imageData.data[i+3] = 255;
      }

      j++;
    }

    context.clearRect(0, 0, 513, 513);
    context.putImageData(imageData, 0, 0);
  };
};
