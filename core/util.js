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


snorb.util.projector = new THREE.Projector();
snorb.util.mouseIntersect = function(x, y, object, camera){
  var vector = new THREE.Vector3(
      ( x / window.innerWidth ) * 2 - 1,
      - ( y / window.innerHeight ) * 2 + 1,
      0.5 );
  snorb.util.projector.unprojectVector(vector, camera);

  var dir = vector.sub(camera.position).normalize();
  var ray = new THREE.Raycaster(camera.position.clone(), dir);
  if(object instanceof Array){
    return ray.intersectObjects(object);
  }else{
    return ray.intersectObject(object);
  }
};
