var Brush = function() {
  var isSource = true;
  var brush_size = 11.0;
  var brush_width = (brush_size-1)/2.0;
  var brush = new Array(brush_size);

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
        brush[ii][jj] = 1.0 - pow(radius, 1.0/4.0);
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
