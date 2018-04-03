"use strict";

// Perlin Noise class
var PerlinNoise = function() {
  var display_map = [];
  var perm = [];
  var grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ]; 

  var p = [
    151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
  ];

  this.dot = function(g, x, y) {
    return g[0]*x + g[1]*y;
  };

  this.mix = function(a, b, t) {
    return (1-t)*a + t*b;
  };

  this.fade = function(t) {
    return t*t*t*(t*(t*6-15)+10);
  };

  this.noise = function(x, y) {
    var X = Math.floor(x);
    var Y = Math.floor(y);

    x = x - X;
    y = y - Y;

    X = X & 255;
    Y = Y & 255;

    var gi00 = perm[X+perm[Y]] % 12;
    var gi01 = perm[X+perm[Y+1]] % 12;
    var gi10 = perm[X+1+perm[Y]] % 12;
    var gi11 = perm[X+1+perm[Y+1]] % 12;

    var n00 = this.dot(grad3[gi00], x, y);
    var n01 = this.dot(grad3[gi01], x, y-1);
    var n10 = this.dot(grad3[gi10], x-1, y);
    var n11 = this.dot(grad3[gi11], x-1, y-1);

    var u = this.fade(x);
    var v = this.fade(y);

    var nx0 = this.mix(n00, n10, u);
    var nx1 = this.mix(n01, n11, u);

    var nxy = this.mix(nx0, nx1, v);

    return nxy;
  };

  this.resetDrawing = function(hasSeed = false) {
    console.log("in PerlinNoise::resetDrawing");

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
    console.log("in PerlinNoise::init");
    var size = 513*513;
    display_map = new Array(size);

    for (var i=0; i<512; i++) {
      perm[i] = p[i & 255];
    }

    // generate new random board
    this.resetDrawing(false);
  };

  this.propagate = function() {

    var ran = 40 + Math.random() * (150 - 40);
    var A = 0.2 + Math.random() * (0.8 - 0.2);
    var B = 0.2 + Math.random() * (0.8 - 0.2);
    var C = 0.2 + Math.random() * (0.8 - 0.2);

    for (var i=1; i<513-1; i++) {
      for (var j=1; j<513-1; j++) {
        /*
        var noise = 
          this.noise(i * (1.0 / 273.0) + ran, j * (1.0 / 273.0) + ran)
          + this.noise(i * (1.0 / 67.0) + ran, j * (1.0 / 67.0) + ran)
          + this.noise(i * (1.0 / 18.0) + ran, j * (1.0 / 18.0) + ran);
        */

        //var noise = this.noise(i * (1.0 / 37.0) + ran, j * (1.0 / 37.0) + ran);
        /*
        var noise = 
          this.noise(1 * i * (1.0 / 513.0), 1 * j * (1.0 / 513.0))
          + 0.50 * this.noise(2 * i * (1.0 / 513.0), 2 * j * (1.0 / 513.0))
          + 0.25 * this.noise(4 * i * (1.0 / 513.0), 4 * j * (1.0 / 513.0));
        */
        //var noise_mapped = (1.0 / 6.0) * (noise + 3);
        //display_map[this.index(i, j)] = noise_mapped;
        //display_map[this.index(i, j)] = Math.pow(noise_mapped, 1.25);


        var nx = i / ran + 0.5;
        var ny = j / ran + 0.5;
        var n = A * this.noise((1/A) * nx, (1/A) * ny) 
          + B * this.noise((1/B) * nx, (1/B) * ny)
          + C * this.noise((1/C) * nx, (1/C) * ny);
        var n_mapped = n.map(-1, 1, 0, 1);
        display_map[this.index(i, j)] = n_mapped;
      }
    }
  };

  this.display = function() {
    // console.log("in PerlinNoise::display");
    var canvas = $('#canvas')[0];
    var context = canvas.getContext('2d');

    var j = 0;
    for (var i = 0; i < imageData.data.length; i += 4) {
      var val = display_map[j];


      /*
      imageData.data[i] = val * 255;
      imageData.data[i+1] = val * 255;
      imageData.data[i+2] = val * 255;
      imageData.data[i+3] = 255;
      */

      /*
      if (val < 0.45) {
        imageData.data[i] = 64.0;
        imageData.data[i+1] = 96.0;
        imageData.data[i+2] = (val + 0.45) * 255.0;
        imageData.data[i+3] = 255;
      }
      else {
        imageData.data[i] = 64.0;
        imageData.data[i+1] = val * 255.0;
        imageData.data[i+2] = 98.0;
        imageData.data[i+3] = 255;
      }
      */
      


      
      /*
      // water
      if (val < 0.45) {
        imageData.data[i] = 64.0;
        imageData.data[i+1] = 96.0;
        imageData.data[i+2] = (1 - val) * 255.0;
        imageData.data[i+3] = 255;
      }
      // beach
      else if (val < 0.45) {
        imageData.data[i] = 93.0;
        imageData.data[i+1] = 127.0;
        imageData.data[i+2] = 253.0;
        imageData.data[i+3] = 255;
      }
      // forest
      else if (val < 0.50) {
        imageData.data[i] = 115.0;
        imageData.data[i+1] = 168.0;
        imageData.data[i+2] = 99.0;
        imageData.data[i+3] = 255;
      }
      // jungle
      else if (val < 0.50) {
        imageData.data[i] = 64.0;
        imageData.data[i+1] = 125.0;
        imageData.data[i+2] = 98.0;
        imageData.data[i+3] = 255;
      }
      // savannah
      else if (val < 0.64) {
        imageData.data[i] = 164.0;
        imageData.data[i+1] = 188.0;
        imageData.data[i+2] = 125.0;
        imageData.data[i+3] = 255;
      }
      // desert
      else if (val < 0.76) {
        imageData.data[i] = 190.0;
        imageData.data[i+1] = 209.0;
        imageData.data[i+2] = 174.0;
        imageData.data[i+3] = 255;
      }
      // snow
      else {
        imageData.data[i] = 209.0;
        imageData.data[i+1] = 209.0;
        imageData.data[i+2] = 214.0;
        imageData.data[i+3] = 255;
      }
      */


      // water
      if (val < 0.45) {
        imageData.data[i] = 64.0;
        imageData.data[i+1] = 96.0;
        imageData.data[i+2] = (val + 0.45) * 255.0;
        imageData.data[i+3] = 255;
      }
      else {
        imageData.data[i] = 10.0;
        imageData.data[i+1] = val * 255.0;
        imageData.data[i+2] = 50.0;
        imageData.data[i+3] = 255;
      }

      j++;
    }

    context.clearRect(0, 0, 513, 513);
    context.putImageData(imageData, 0, 0);
  };
};

Number.prototype.map = function(in_min, in_max, out_min, out_max) {
  return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};
