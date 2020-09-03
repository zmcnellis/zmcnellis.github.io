var imageData = {};
var imageData_initial = {};
var running = false;
var paintmode = 'PAINT_SOURCE';

// main
$(document).ready(function() {
  var imageObj = new Image();
  var manager = new Manager();
  var canvas = $('#canvas')[0];
  var context = canvas.getContext('2d');

  imageObj.onload = function() {
    context.drawImage(imageObj, 0, 0);
    imageData_initial = context.getImageData(0, 0, 500, 500);
    manager.init();
    manager.convertToDisplay();

    running = true;
  };

  imageObj.crossOrigin = "Anonymous";
  imageObj.src = 'img/cat2.png';

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
    if (this.value == "source") {
      paintmode = 'PAINT_SOURCE';
    }
    else {
      paintmode = 'PAINT_OBSTRUCTION';
    }
  });
  $('input[name=brushSize]').change(function() {
    manager.resetBrushSize();
  });

  var animation_step = function() {
    if (running) {
      if (isPressed) {
        manager.dabSomePaint(parseInt(x), 500-parseInt(y));
      }
      manager.propagate();
      manager.convertToDisplay();
      manager.display();
    }
  }

  var animFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    null;

  if (animFrame !== null) {
    var recursiveAnim = function() {
      animation_step();
      animFrame(recursiveAnim, canvas);
    };

    animFrame(recursiveAnim, canvas);
  }
  else {
    var ONE_TIME_FRAME = 1000.0 / 60.0;
    setInterval(animation_step, ONE_TIME_FRAME);
  }

});

// CFD class
var CFD = function() {
  var Nx = 500;
  var Ny = 500;
  var dx = 1.0;
  var viscosity = 1.1; 
  var d = new Array(Nx*Ny);
  var v = new Array(Nx*Ny*2);
  var c = new Array(Nx*Ny*3);
  var d2 = new Array(Nx*Ny);
  var v2 = new Array(Nx*Ny*2);
  var c2 = new Array(Nx*Ny*3);
  var div = new Array(Nx*Ny);
  var p = new Array(Nx*Ny);
  var F = new Array(Nx*Ny*2);
  var F2 = new Array(Nx*Ny*2);
  var obstruction = new Array(Nx*Ny);

  this.reset = function() {
    console.log("in CFD::reset");
    for (var i=0; i<Nx; i++) {
      for (var j=0; j<Ny; j++) {
        d[this.index(i, j)] = 0.0;
        v[this.index(i, j)*2] = 0.0;
        v[this.index(i, j)*2+1] = 0.0;
        c[this.index(i, j)*3] = 0.0;
        c[this.index(i, j)*3+1] = 0.0;
        c[this.index(i, j)*3+2] = 0.0;
        d2[this.index(i, j)] = 0.0;
        v2[this.index(i, j)*2] = 0.0;
        v2[this.index(i, j)*2+1] = 0.0;
        c2[this.index(i, j)*3] = 0.0;
        c2[this.index(i, j)*3+1] = 0.0;
        c2[this.index(i, j)*3+2] = 0.0;
        div[this.index(i, j)] = 0.0;
        p[this.index(i, j)] = 0.0;
        F[this.index(i, j)*2] = 0.0;
        F[this.index(i, j)*2+1] = 0.0;
        F2[this.index(i, j)*2] = 0.0;
        F2[this.index(i, j)*2+1] = 0.0;
        obstruction[this.index(i, j)] = 1.0;
      }
    }
  };

  this.update = function(dt) {
    this.advect(dt);
    this.sources(dt);
    //this.vorticityConfinement(dt);
    //this.kinematicViscosity(dt);

    for (var i=0; i<2; i++) {
      this.boundaries();
      this.project();
    }
  };

  this.advect = function(dt) {
    for (var i=0; i<Nx; i++) {
      for (var j=0; j<Ny; j++) {
        var newPosX = i*dx - this.getVelocity(this.index(i, j)*2)*dt;
        var newPosY = j*dx - this.getVelocity(this.index(i, j)*2+1)*dt;

        var _i = parseInt(newPosX/dx);
        var _j = parseInt(newPosY/dx);

        // interpolate density
        d2[this.index(i, j)] = this.interpolateD(_i, _j, newPosX, newPosY);

        // interpolate velocity
        v2[this.index(i, j)*2] = this.interpolateV(_i, _j, 0, newPosX, newPosY);
        v2[this.index(i, j)*2+1] = this.interpolateV(_i, _j, 1, newPosX, newPosY);

        // interpolate color
        c2[this.index(i, j)*3] = this.interpolateC(_i, _j, 0, newPosX, newPosY);
        c2[this.index(i, j)*3+1] = this.interpolateC(_i, _j, 1, newPosX, newPosY);
        c2[this.index(i, j)*3+2] = this.interpolateC(_i, _j, 2, newPosX, newPosY);
      }
    }

    this.swapDensity();
    this.swapVelocity();
    this.swapColor();
  };

  this.sources = function(dt) {
    var gravityX = 0.0;
    var gravityY = 9.8;
    for (var i=0; i<Nx; i++) {
      for (var j=0; j<Ny; j++) {
        v[this.index(i, j)*2] += gravityX * this.getDensity(this.index(i, j)) * dt;
        v[this.index(i, j)*2+1] += gravityY * this.getDensity(this.index(i, j)) * dt;
      }
    }
  };

  this.divergence = function() {
    for (var i=2; i<Nx-2; i++) {
      for (var j=2; j<Ny-2; j++) {
        var horz = (this.getVelocity(this.index(i+1, j)*2) - this.getVelocity(this.index(i-1, j)*2)) / 2*dx;
        var vert = (this.getVelocity(this.index(i, j+1)*2+1) - this.getVelocity(this.index(i, j-1)*2+1)) / 2*dx;

        //div[this.index(i, j)] = (horz + vert) + div2[this.index(i, j)]*50.0;
        div[this.index(i, j)] = (horz + vert);
      }
    }
  };

  this.project = function() {
    this.divergence();
    for (var i=0; i<Nx; i++) {
      for (var j=0; j<Ny; j++) {
        p[this.index(i, j)] = 0.0;
      }
    }

    // gauss-seidel
    for (var loops=0; loops<6; loops++) {
      for (var i=1; i<Nx-1; i++) {
        for (var j=1; j<Ny-1; j++) {
          var avg = 0.25 * (p[this.index(i+1, j)] + p[this.index(i-1, j)] + p[this.index(i, j+1)] + p[this.index(i, j-1)]);
          p[this.index(i, j)] = avg - 0.25*dx*dx * div[this.index(i, j)];
        }
      }
    }

    for (var i=1; i<Nx-1; i++) {
      for (var j=1; j<Ny-1; j++) {
        F[this.index(i, j)*2] = (p[this.index(i+1, j)] - p[this.index(i-1, j)]) / 2.0*dx;
        F[this.index(i, j)*2+1] = (p[this.index(i, j+1)] - p[this.index(i, j-1)]) / 2.0*dx;
      }
    }

    for (var i=0; i<Nx; i++) {
      for (var j=0; j<Ny; j++) {
        v[this.index(i, j)*2] = v[this.index(i, j)*2] - F[this.index(i, j)*2];
        v[this.index(i, j)*2+1] = v[this.index(i, j)*2+1] - F[this.index(i, j)*2+1];
      }
    }
  };

  this.vorticityConfinement = function(dt) {
    for (var i=0; i<Nx; i++) {
      for (var j=0; j<Ny; j++) {
         var w = this.getVorticity(i, j);
         var fx = Math.abs(this.getVorticity(i+1, j)) - Math.abs(this.getVorticity(i-1, j));
         var fy = Math.abs(this.getVorticity(i, j+1)) - Math.abs(this.getVorticity(i, j-1));
         var magnitude = Math.pow(Math.pow(fx, 2.0)+Math.pow(fy, 2.0), 0.5);
         if (magnitude == 0.0) { return; }
         fx /= magnitude;
         fy /= magnitude;

         v[this.index(i, j)*2  ] = this.getVelocity(this.index(i, j)*2) - (fy*w*dx*F2[this.index(i, j)*2]*dt);
         v[this.index(i, j)*2+1] = this.getVelocity(this.index(i, j)*2+1) - (fx*w*dx*F2[this.index(i, j)*2+1]*dt);
      }
    }
  };

  this.kinematicViscosity = function(dt) {
    for (var i=1; i<Nx-1; i++) {
      for (var j=1; j<Ny-1; j++) {
        v2[this.index(i, j)*2] = Math.exp(-(4*viscosity*dt)/(dx*dx)) * (this.getVelocity(this.index(i, j)*2) + (viscosity*dt)/(dx*dx) * (this.getVelocity(this.index(i+1, j)*2) + this.getVelocity(this.index(i-1, j)*2) + this.getVelocity(this.index(i, j+1)*2) + this.getVelocity(this.index(i, j-1)*2)));
        v2[this.index(i, j)*2+1] = Math.exp(-(4*viscosity*dt)/(dx*dx)) * (this.getVelocity(this.index(i, j)*2+1) + (viscosity*dt)/(dx*dx) * (this.getVelocity(this.index(i+1, j)*2+1) + this.getVelocity(this.index(i-1, j)*2+1) + this.getVelocity(this.index(i, j+1)*2+1) + this.getVelocity(this.index(i, j-1)*2+1)));
      }   
    }
    this.swapVelocity();
  };

  this.boundaries = function() {
   for (var j=0; j<Ny-1; j++) {
      v[this.index(0, j)*2] = 0.0;
      v[this.index(Nx-1, j)*2] = 0.0;
   }
   for (var i=0; i<Nx; i++) {
      for (var j=0; j<Ny; j++) {
         v[this.index(i, j)*2] *= obstruction[this.index(i, j)];
         v[this.index(i, j)*2+1] *= obstruction[this.index(i, j)];
         d[this.index(i, j)] *= obstruction[this.index(i, j)];
      }
   }

  };

  this.interpolateD = function(i, j, x, y) {
    var x1 = i*dx, y1 = j*dx;
    var x2 = (i+1)*dx, y2 = (j+1)*dx;

    var term1 = 1.0 / ((x2 - x1) * (y2 - y1));

    var term2 = this.getDensity(this.index(i, j)) * (x2 - x) * (y2 - y);
    var term3 = this.getDensity(this.index(i+1, j)) * (x - x1) * (y2 - y);
    var term4 = this.getDensity(this.index(i, j+1)) * (x2 - x) * (y - y1);
    var term5 = this.getDensity(this.index(i+1, j+1)) * (x - x1) * (y - y1);

    return term1 * (term2 + term3 + term4 + term5);
  };

  this.interpolateV = function(i, j, comp, x, y) {
    var x1 = i*dx, y1 = j*dx;
    var x2 = (i+1)*dx, y2 = (j+1)*dx;

    var term1 = 1.0 / ((x2 - x1) * (y2 - y1));

    var term2 = this.getVelocity(this.index(i, j)*2+comp) * (x2 - x) * (y2 - y);
    var term3 = this.getVelocity(this.index(i+1, j)*2+comp) * (x - x1) * (y2 - y);
    var term4 = this.getVelocity(this.index(i, j+1)*2+comp) * (x2 - x) * (y - y1);
    var term5 = this.getVelocity(this.index(i+1, j+1)*2+comp) * (x - x1) * (y - y1);

    return term1 * (term2 + term3 + term4 + term5);
  };

  this.interpolateC = function(i, j, comp, x, y) {
    var x1 = i*dx, y1 = j*dx;
    var x2 = (i+1)*dx, y2 = (j+1)*dx;

    var term1 = 1.0 / ((x2 - x1) * (y2 - y1));

    var term2 = this.getColor(this.index(i, j)*3+comp) * (x2 - x) * (y2 - y);
    var term3 = this.getColor(this.index(i+1, j)*3+comp) * (x - x1) * (y2 - y);
    var term4 = this.getColor(this.index(i, j+1)*3+comp) * (x2 - x) * (y - y1);
    var term5 = this.getColor(this.index(i+1, j+1)*3+comp) * (x - x1) * (y - y1);

    return term1 * (term2 + term3 + term4 + term5);
  };

  this.index = function(i, j) {
    return i+Nx*j;
  };

  this.swapDensity = function() {
    var temp = d;
    d = d2;
    d2 = temp;
  };

  this.swapVelocity = function() {
    var temp = v;
    v = v2;
    v2 = temp;
  };

  this.swapColor = function() {
    var temp = c;
    c = c2;
    c2 = temp;
  };

  this.getColor = function(ndx) {
    if (ndx < 0 || ndx >= Nx*Ny*3) { return 0.0; }
    return c[ndx];
  };

  this.setColor = function(ndx, val) {
    if (ndx < 0 || ndx >= Nx*Ny*3) { return; }
    c[ndx] = val;
  };

  this.getVelocity = function(ndx) {
    if (ndx < 0 || ndx >= Nx*Ny*2) { return 0.0; }
    return v[ndx];
  };

  this.setVelocity = function(ndx, val) {
    if (ndx < 0 || ndx >= Nx*Ny*2) { return; }
    v[ndx] = val;
  };

  this.getDensity = function(ndx) {
    if (ndx < 0 || ndx >= Nx*Ny) { return 0.0; }
    return d[ndx];
  };

  this.setDensity = function(ndx, val) {
    if (ndx < 0 || ndx >= Nx*Ny) { return; }
    d[ndx] = val;
  };

  this.getObstruction = function(ndx) {
    if (ndx < 0 || ndx >= Nx*Ny) { return 0.0; }
    return obstruction[ndx];
  };

  this.setObstruction = function(ndx, val) {
    if (ndx < 0 || ndx >= Nx*Ny) { return; }
    obstruction[ndx] = val;
  };

  this.getVorticity = function(i, j) {
   if (i < 0 || i >= Nx || j < 0 || j >= Ny) { return 0.0; }
   //return (this.getVelocity(this.index(i+1, j)*2+1), - getVelocity(i-1, j, 1) - getVelocity(i, j+1, 0) + getVelocity(i, j-1, 0)) / (2*dx);
   return (this.getVelocity(this.index(i+1, j)*2+1) - this.getVelocity(this.index(i-1, j)*2+1) - this.getVelocity(this.index(i, j+1)*2) + this.getVelocity(this.index(i, j-1)*2)) / (2*dx);
   //return (- this.getVelocity(this.index(i-1, j)*2+1) - this.getVelocity(this.index(i, j+1)*2) + this.getVelocity(this.index(i, j-1)*2)) / (2*dx);
  };

  this.setExternalForce = function(ndx, val) {
    if (ndx < 0 || ndx >= Nx*Ny*2) { return; }
    F2[ndx] = val;
  };

};

var Brush = function(isSource) {
  var brush_size = $('input[name=brushSize]').val();
  var brush_width = (brush_size-1)/2;
  var brush = new Array(brush_size);

  for (var i = 0; i < brush_size; i++) {
    brush[i] = new Array(brush_size);
  }

  for (var i = -brush_width; i <= brush_width; i++) {
    var ii = i + brush_width;
    var ifactor = (brush_width - Math.abs(i)) / brush_width;
    for (var j = -brush_width; j <= brush_width; j++) {
      var jj = j + brush_width;
      var jfactor = (brush_width - Math.abs(j)) / brush_width;
      var radius = (ifactor*ifactor + jfactor*jfactor) / 2.0;

      if (isSource) {
        brush[ii][jj] = Math.pow(radius, 0.5);
      }
      else {
        brush[ii][jj] = 1.0 - Math.pow(radius, 1.0/4.0);
      }
    }
  }

  this.getBrushWidth = function() {
    return brush_width;
  };

  this.getBrushAt = function(i, j) {
    return brush[i][j];
  };
};

// Manager class
var Manager = function() {
  var back_image = true;
  var display_map = [];
  var baseimage = [];
  var scaling_factor = 1.0;
  var source_brush = new Brush(true);
  var obstruction_brush = new Brush(false);
  var cfd = new CFD();

  this.resetBrushSize = function() {
    source_brush = new Brush(true);
    obstruction_brush = new Brush(false);
  };

  this.readImage = function(initial) {
    console.log("in Manager::readImage");
    var canvas = $('#canvas')[0];
    var context = canvas.getContext('2d');
    imageData = imageData_initial;

    if (initial) {
      var j = 0;
      for (var i = 0; i < imageData.data.length; i += 4) {
        // red
        baseimage[j*3] = imageData.data[i] / 255.0;

        // green
        baseimage[j*3+1] = imageData.data[i+1] / 255.0;

        // blue
        baseimage[j*3+2] = imageData.data[i+2] / 255.0;

        j++;
      }
    }
  };

  this.resetDrawing = function(initial) {
    console.log("in Manager::resetDrawing");
    cfd.reset();


    if (back_image) {
      this.readImage(initial);
    }
    else {
      var size = 500*500;
      for (var i = 0; i < 3*size; i++) {
        if (initial) {
          baseimage[i] = 0.0;
        }
      }
    }

    for (var i=0; i<500; i++) {
      for (var j=0; j<500; j++) {
        var index = i + 500 * j;
        var r = baseimage[index*3];
        var g = baseimage[index*3+1];
        var b = baseimage[index*3+2];
        cfd.setColor(3*index, r);
        cfd.setColor(3*index+1, g);
        cfd.setColor(3*index+2, b);
      }
    }
  };

  this.init = function() {
    console.log("in Manager::init");
    var size = 500*500;
    display_map = new Array(3*size);
    baseimage = new Array(3*size);

    for (var i = 0; i < 3*size; i++) {
      display_map[i] = 0.0;
      baseimage[i] = 0.0;
    }

    // set pixel values for base image
    this.resetDrawing(true);
  };

  this.convertToDisplay = function() {
    //console.log("in Manager::convertToDisplay");
    for (var i = 0; i < 500; i++) {
      for (var j = 0; j < 500; j++) {
        var index = i + 500 * j;
        var r, g, b;
        r = cfd.getColor(3*index);
        g = cfd.getColor(3*index+1);
        b = cfd.getColor(3*index+2);
        display_map[3*index] = r * scaling_factor;
        display_map[3*index+1] = g * scaling_factor;
        display_map[3*index+2] = b * scaling_factor;
      }
    }
  };

  this.propagate = function() {
    var dt = 0.08;
    cfd.update(dt);
  };

  this.resetScaleFactor = function(amount) {
    console.log("in Manager::resetScaleFactor");
    scaling_factor *= amount;
  };

  this.dabSomePaint = function(x, y) {
    console.log("in Manager::dabSomePaint");
    var brush_width = source_brush.getBrushWidth();
    var xstart = parseInt(x - brush_width);
    var ystart = parseInt(y - brush_width);
    if (xstart < 0) { xstart = 0; }
    if (ystart < 0) { ystart = 0; }

    var xend = x + brush_width;
    var yend = y + brush_width;
    if (xend >= 500) { xend = 500-1; }
    if (yend >= 500) { yend = 500-1; }

    if (paintmode == 'PAINT_OBSTRUCTION') {
      for (var ix=xstart; ix <= xend; ix++) {
        for (var iy=ystart; iy <= yend; iy++) {
          var index = ix + 500*(500-iy);
          var r = cfd.getColor(3*index);
          var g = cfd.getColor(3*index+1);
          var b = cfd.getColor(3*index+2);
          var o = cfd.getObstruction(index);

          cfd.setObstruction(index, o*obstruction_brush.getBrushAt(ix-xstart, iy-ystart));
          cfd.setColor(3*index, r*obstruction_brush.getBrushAt(ix-xstart, iy-ystart));
          cfd.setColor(3*index+1, g*obstruction_brush.getBrushAt(ix-xstart, iy-ystart));
          cfd.setColor(3*index+2, b*obstruction_brush.getBrushAt(ix-xstart, iy-ystart));
        }
      }
    }
    else if (paintmode == 'PAINT_SOURCE') {
      for (var ix=xstart; ix <= xend; ix++) {
        for (var iy=ystart; iy <= yend; iy++) {
          var index = ix + 500*(500-iy);
          var r = cfd.getColor(3*index);
          var g = cfd.getColor(3*index+1);
          var b = cfd.getColor(3*index+2);
          var d = cfd.getDensity(index);

          cfd.setDensity(index, d+source_brush.getBrushAt(ix-xstart, iy-ystart));
          cfd.setColor(3*index, r+source_brush.getBrushAt(ix-xstart, iy-ystart));
          cfd.setColor(3*index+1, g+source_brush.getBrushAt(ix-xstart, iy-ystart));
          cfd.setColor(3*index+2, b+source_brush.getBrushAt(ix-xstart, iy-ystart));
          cfd.setExternalForce(2*index, 2.0);
          cfd.setExternalForce(2*index+1, 2.0);
        }
      }
    }
  };

  this.display = function() {
    //console.log("in Manager::display");
    var canvas = $('#canvas')[0];
    var context = canvas.getContext('2d');

    var j = 0;
    for (var i = 0; i < imageData.data.length; i += 4) {
      // red
      imageData.data[i] = display_map[j*3] * 255.0;

      // green
      imageData.data[i+1] = display_map[j*3+1] * 255.0;

      // blue
      imageData.data[i+2] = display_map[j*3+2] * 255.0;
      
      // alpha
      imageData.data[i+3] = 255;

      j++;
    }

    context.clearRect(0, 0, 500, 500);
    context.putImageData(imageData, 0, 0);
  };
};
