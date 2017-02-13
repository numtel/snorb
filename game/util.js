'use strict';
snorb.util = snorb.util || {};

snorb.util.cacheShaders = false;
snorb.util.loadedShaders = {};
snorb.util.shader = function(filename){
  if(snorb.util.loadedShaders[filename] !== undefined){
    return snorb.util.loadedShaders[filename];
  };
  var parseChunks = function(glsl){
    var chunkName;
    glsl = glsl.split("THREE.ShaderChunk['");
    for(var i = 1; i<glsl.length; i++){
      chunkName = glsl[i].substr(0,glsl[i].indexOf("']"));
      glsl[i] = THREE.ShaderChunk[chunkName] + glsl[i].substr(chunkName.length+2);
    };
    return glsl.join('');
  }; 
  jQuery.ajax({
    'async': false,
    'url': 'shaders/' + filename + '.glsl' + 
      (snorb.util.cacheShaders ? '' : '?t=' + snorb.util.randomString()),
    'complete': function(jqXHR, textStatus){
      if(textStatus === 'success'){
        snorb.util.loadedShaders[filename] = parseChunks(jqXHR.responseText);
      };
    }
  });
  return snorb.util.loadedShaders[filename];
};

snorb.util.randomString = function(length){
  if(length === undefined){
    length = 5;
  };
  var text = "",
      possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789";
  for( var i=0; i < length; i++ ){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  };
  return text;
};

snorb.util.fillArray = function(value, count) {
  var out = [];
  for(var i=0; i<count; i++) {
    out.push(value);
  }
  return out;
};

snorb.util.pointsToPolygon = function(points, maxEdgeLength){
  console.time('homebrewed mergization');

  // Distance between two points [0,0] or index of point from passed points array
  var dist = function(a, b){
    if(typeof a === "number"){
      a = points[a];
    };
    if(typeof b === "number"){
      b = points[b];
    };
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + 
            Math.pow(a[1] - b[1], 2));
  };
  if(!points.length){
    return undefined;
  };
  // Accept points as [x, y] or {x: x, y: y}
  if(!(points[0] instanceof Array)){
    var pointsAsArray = [];
    for(var i = 0; i<points.length; i++){
      pointsAsArray.push([points[i].x, points[i].y]);
    };
    points = pointsAsArray;
  };

  // Determine triangle frequency per point
  var pointFreq = [];
  points.forEach(function(v){
    pointFreq.push(0);
  });
  var triangles = Delaunay.triangulate(points);
  for(var i = triangles.length; i; i-=3){
    if(dist(triangles[i-1], triangles[i-2]) < maxEdgeLength &&
       dist(triangles[i-3], triangles[i-2]) < maxEdgeLength &&
       dist(triangles[i-1], triangles[i-3]) < maxEdgeLength){
      pointFreq[triangles[i-1]]++;
      pointFreq[triangles[i-2]]++;
      pointFreq[triangles[i-3]]++;
    };
  };
  
  // Points that are used in 3 or fewer triangles exist on the boundary
  var output =[];
  pointFreq.forEach(function(freq, i){
    if(freq<4){
      output.push(points[i]);
    };
  });
  
  // Sort points by looping around by each next closest point
  var sorted = [];
  while(output.length>0){
    var nextPoint = output.pop(),
        lastPoint = sorted[sorted.length-1];
    if(lastPoint === undefined || 
       nextPoint[0] !== lastPoint[0] || 
       nextPoint[1] !== lastPoint[1]){
      sorted.push(nextPoint);
      lastPoint = nextPoint;
    };
    output=output.sort(function(a,b){
      var distA =dist(lastPoint, a),
          distB =dist(lastPoint, b);
      if(distA < distB){
        return 1;
      }else if(distA === distB){
        return 0;
      };
      return -1;
    });
  };
  
  //sorted=simplifyPath(sorted,0.1);

  console.timeEnd('homebrewed mergization');
  // Convert points back to {x,y}
  return sorted.map(function(p){
    return {x: p[0], y: p[1]};
  });

  
};


snorb.util.pointsToPolygon_jsts = function(points, maxEdgeLength){
  // Points array can contain either [x, y] or {x:x, y:y}.
  // Theoretical maxEdgeLength is terra.data.scale * sqrt(2) but due to
  // floating point noise, terra.data.scale * 2 is a better value.
  var dist = function(a, b){
    return Math.sqrt(Math.pow(points[a][0] - points[b][0], 2) + 
            Math.pow(points[a][1] - points[b][1], 2));
  };
  if(!points.length){
    return undefined;
  };
  // Accept points as [x, y] or {x: x, y: y}
  if(!(points[0] instanceof Array)){
    var pointsAsArray = [];
    for(var i = 0; i<points.length; i++){
      pointsAsArray.push([points[i].x, points[i].y]);
    };
    points = pointsAsArray;
  };
  var triangles = Delaunay.triangulate(points),
      polys = [];
  for(var i = triangles.length; i; i-=3){
    if(dist(triangles[i-1], triangles[i-2]) < maxEdgeLength &&
       dist(triangles[i-3], triangles[i-2]) < maxEdgeLength &&
       dist(triangles[i-1], triangles[i-3]) < maxEdgeLength){
      // Add in JSTS format
      polys.push('POLYGON((' +
        points[triangles[i-1]][0] + ' ' + points[triangles[i-1]][1] + ', ' +
        points[triangles[i-2]][0] + ' ' + points[triangles[i-2]][1] + ', ' +
        points[triangles[i-3]][0] + ' ' + points[triangles[i-3]][1] + ', ' +
        points[triangles[i-1]][0] + ' ' + points[triangles[i-1]][1] + '))');
    };
  };
  if(polys.length < 2){
    return undefined;
  };
  var reader = new jsts.io.WKTReader(),
      merged = reader.read(polys[0]).union(reader.read(polys[1]));
  console.time('jsts mergization');
  for(var i = 2; i<polys.length; i++){
    try{
      merged = merged.union(reader.read(polys[i]));
    }catch(err){
      console.log('Error triangulating points!');
    };
  };
  console.timeEnd('jsts mergization');
  var polygon = [];
  if(merged.shell !==undefined){
    for(var i = 0; i<merged.shell.points.length; i++){
      polygon.push({x: merged.shell.points[i].x, y: merged.shell.points[i].y});
    };
  };
  return polygon;
};

snorb.util.pointsToPolygonGPC = function(points, maxEdgeLength){
  // Points array can contain either [x, y] or {x:x, y:y}.
  // Theoretical maxEdgeLength is terra.data.scale * sqrt(2) but due to
  // floating point noise, terra.data.scale * 2 is a better value.
  var dist = function(a, b){
    return Math.sqrt(Math.pow(points[a][0] - points[b][0], 2) + 
            Math.pow(points[a][1] - points[b][1], 2));
  };
  if(!points.length){
    return undefined;
  };
  // Accept points as [x, y] or {x: x, y: y}
  if(!(points[0] instanceof Array)){
    var pointsAsArray = [];
    for(var i = 0; i<points.length; i++){
      pointsAsArray.push([points[i].x, points[i].y]);
    };
    points = pointsAsArray;
  };
  var triangles = Delaunay.triangulate(points),
      polys = [],
      createPoly = function(points){
        var res  = new gpcas.geometry.PolyDefault();
        for(var i=0 ; i < points.length ; i++) {    
            res.addPoint(new gpcas.geometry.Point(points[i][0],points[i][1]));
        }
        return res;
      };
  for(var i = triangles.length; i; i-=3){
    if(dist(triangles[i-1], triangles[i-2]) < maxEdgeLength &&
       dist(triangles[i-3], triangles[i-2]) < maxEdgeLength &&
       dist(triangles[i-1], triangles[i-3]) < maxEdgeLength){
      polys.push(createPoly([
        points[triangles[i-1]],
        points[triangles[i-2]],
        points[triangles[i-3]]
      ]));
    };
  };
  if(polys.length < 2){
    return;
  };
  console.time('gpc mergization');
  var merged = polys[0].union(polys[1]);
  for(var i = 2; i<polys.length; i++){
    try{
      merged = merged.union(polys[i]);
    }catch(err){
      console.log('Error triangulating points!');
    };
  };
  console.timeEnd('gpc mergization');
  var polygon = [];
  if(merged !==undefined){
    var mergedPoints = merged.m_List._array[0].m_List._array;
    for(var i = 0; i<mergedPoints.length; i++){
      polygon.push({x: mergedPoints[i].x, y: mergedPoints[i].y});
    };
  };
  return polygon;
};

snorb.util.polygonToJSTS = function(poly){
  var output = 'POLYGON((';
  for(var i = 0; i<poly.length; i++){
    output += poly[i].x + ' ' + poly[i].y +
              (i === poly.length - 1 ? '))' : ', ');
  };
  return output;
};

snorb.util.mergePolygons = function(polys){
  if(!polys  || !polys.length){
    return;
  };
  if(polys.length === 1){
    return polys[0];
  };

  var jstsPolys = _.map(polys, snorb.util.polygonToJSTS),
      reader = new jsts.io.WKTReader(),
      merged = reader.read(jstsPolys[0]).union(reader.read(jstsPolys[1]));
  for(var i = 2; i<jstsPolys.length; i++){
    try{
      merged = merged.union(reader.read(jstsPolys[i]));
    }catch(err){
      console.log('Error triangulating points!');
    };
  };
  var polygon = [];
  if(merged.shell !==undefined){
    for(var i = 0; i<merged.shell.points.length; i++){
      polygon.push({x: merged.shell.points[i].x, y: merged.shell.points[i].y});
    };
  };
  return polygon;
};
