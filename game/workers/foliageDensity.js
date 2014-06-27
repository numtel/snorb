'use strict';

onmessage = function(event){
  var terraData = event.data.terraData,
      foliage = event.data.foliage,
      vertexCount = (terraData.size.x + 1) * (terraData.size.y + 1),
      vertices = [],
      minX = -terraData.size.x * terraData.scale / 2,
      maxY = terraData.size.y * terraData.scale / 2,
      x = minX, y = maxY,
      score, distance;
  vertices.length = vertexCount;
  for(var i = 0; i < vertexCount; i++){
    score = 0;
    for(var j = 0; j < foliage.length; j++){
      distance = Math.sqrt(Math.pow(foliage[j].x - x, 2) +
                           Math.pow(foliage[j].y - y, 2));
      if(distance < 200){
        score += 200 - distance;
      };
    };
    vertices[i] = Math.round(score);
    // Go to next vertex
    x += terraData.scale;
    if(x > -minX){
      x = minX;
      y -= terraData.scale;
    };
  };
  postMessage(vertices);
};
