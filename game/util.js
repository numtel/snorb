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

snorb.util.pointsToPolygon = function(points, maxEdgeLength){
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
  for(var i = 2; i<polys.length; i++){
    try{
      merged = merged.union(reader.read(polys[i]));
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

