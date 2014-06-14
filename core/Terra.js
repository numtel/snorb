'use strict';

snorb.core.Terra = function(sceneObj, data){
  var that = this;

  this.defaults = {
    size: new THREE.Vector2(150, 100),
    position: new THREE.Vector3(0, 0, 0),
    scale: 10,
    altitude: 100
  };
  this.data = data = _.defaults(data || {}, this.defaults);

  // Methods
  this.coord = function(pos){
    var getIndex = function(pos){
      var xStart = -data.size.x * data.scale / 2,
          yStart = data.size.y * data.scale / 2,
          vertexIndex = Math.round((pos.x - xStart) / data.scale) +
            (-Math.round((pos.y - yStart) / data.scale) * (data.size.x+1));
      if(pos.x < xStart || 
         pos.x > -xStart || 
         vertexIndex >= ((data.size.x + 1) * (data.size.y + 1)) || 
         vertexIndex < 0){
        // off terrain
        return undefined;
      }
      return vertexIndex;
    };
    var x = pos.x, y = pos.y,
        xR10 = x - (x % data.scale),
        yR10 = y - (y % data.scale),
        xW = x < 0 ? xR10 - data.scale : xR10,
        xE = xW + data.scale,
        yN = y < 0 ? yR10 - data.scale : yR10,
        yS = yN + data.scale,
        propY = (y-yN) / data.scale,
        propX = (x-xW) / data.scale,
        viNW = getIndex({x: xW, y: yN}),
        viNE = getIndex({x: xE, y: yN}),
        viSW = getIndex({x: xW, y: yS}),
        viSE = getIndex({x: xE, y: yS}),
        altitude;
    if(viNW !== undefined &&
       viNE !== undefined &&
       viSW !== undefined &&
       viSE !== undefined){
      var vNW = geometry.vertices[viNW],
          vNE = geometry.vertices[viNE],
          vSW = geometry.vertices[viSW],
          vSE = geometry.vertices[viSE],
          topVal = vNW.z + ((vNE.z - vNW.z) * propX),
          bottomVal = vSW.z + ((vSE.z - vSW.z) * propX);
      altitude = topVal + ((bottomVal - topVal) * propY);
    }else if(viNE !== undefined &&
             viSE !== undefined){
      var vNE = geometry.vertices[viNE],
          vSE = geometry.vertices[viSE];
      altitude = vNE.z + ((vSE.z - vNE.z) * propY);
    }else if(viNW !== undefined &&
             viSW !== undefined){
      var vNW = geometry.vertices[viNW],
          vSW = geometry.vertices[viSW];
      altitude = vNW.z + ((vSW.z - vNW.z) * propY);
    }else if(viNE !== undefined &&
             viNW !== undefined){
      var vNE = geometry.vertices[viNE],
          vNW = geometry.vertices[viNW];
      altitude = vNW.z + ((vNE.z - vNW.z) * propX);
    }else if(viSE !== undefined &&
             viSW !== undefined){
      var vSE = geometry.vertices[viSE],
          vSW = geometry.vertices[viSW];
      altitude = vSW.z + ((vSE.z - vSW.z) * propX);
    }else if(viNW !== undefined){
      altitude = geometry.vertices[viNW].z;
    }else if(viNE !== undefined){
      altitude = geometry.vertices[viNE].z;
    }else if(viSW !== undefined){
      altitude = geometry.vertices[viSW].z;
    }else if(viSE !== undefined){
      altitude = geometry.vertices[viSE].z;
    };
    return {nw: viNW,
            ne: viNE,
            sw: viSW,
            se: viSE,
            propNS: propY,
            propWE: propX,
            altitude: altitude};
  };

  // Initialize
  var material = new THREE.ShaderMaterial({
    uniforms: {
      texture_grass: { type: "t", value: THREE.ImageUtils.loadTexture( 
        'textures/terra/grass.jpg' ) },
      texture_bare: { type: "t", value: THREE.ImageUtils.loadTexture( 
        'textures/terra/dirt.jpg' ) },
      texture_snow: { type: "t", value: THREE.ImageUtils.loadTexture( 
        'textures/terra/snow.jpg' ) },
      texture_rock: { type: "t", value: THREE.ImageUtils.loadTexture( 
        'textures/terra/rock.jpg' ) },
      //common
      diffuse : { type: "c", value: new THREE.Color( 0xeeeeee ) },
      opacity : { type: "f", value: 1.0 },
      map : { type: "t", value: 0, texture: null },
      offsetRepeat : { type: "v4", value: new THREE.Vector4( 0, 0, 1, 1 ) },
      lightMap : { type: "t", value: 2, texture: null },
      envMap : { type: "t", value: 1, texture: null },
      flipEnvMap : { type: "f", value: -1 },
      useRefract : { type: "i", value: 0 },
      reflectivity : { type: "f", value: 1.0 },
      refractionRatio : { type: "f", value: 0.98 },
      combine : { type: "i", value: 0 },
      morphTargetInfluences : { type: "f", value: 0 },

      //fog
      fogDensity : { type: "f", value: 0.25 },
      fogNear : { type: "f", value: 10 },
      fogFar : { type: "f", value: 10000 },
      fogColor : { type: "c", value: new THREE.Color( 0x6495ED ) },

      //lights
      ambientLightColor:{"type":"fv","value":[]},
      directionalLightDirection:{"type":"fv","value":[]},
      directionalLightColor:{"type":"fv","value":[]},
      hemisphereLightDirection:{"type":"fv","value":[]},
      hemisphereLightSkyColor:{"type":"fv","value":[]},
      hemisphereLightGroundColor:{"type":"fv","value":[]},
      pointLightColor:{"type":"fv","value":[]},
      pointLightPosition:{"type":"fv","value":[]},
      pointLightDistance:{"type":"fv1","value":[]},
      spotLightColor:{"type":"fv","value":[]},
      spotLightPosition:{"type":"fv","value":[]},
      spotLightDirection:{"type":"fv","value":[]},
      spotLightDistance:{"type":"fv1","value":[]},
      spotLightAngleCos:{"type":"fv1","value":[]},
      spotLightExponent:{"type":"fv1","value":[]},
      //lambert shading
      ambient: { type: "c", value: new THREE.Color(328965) },
      wrapRGB: { type: "v3", value: new THREE.Vector3(1, 1, 1)},

      //shadowmap
      shadowMap: { type: "tv", value: 6, texture: [] },
      shadowMapSize: { type: "v2v", value: [] },
      shadowBias: { type: "fv1", value: [] },
      shadowDarkness: { type: "fv1", value: [] },
      shadowMatrix: { type: "m4v", value: [] }
    },
    attributes: {
    },
    vertexShader: snorb.util.shader('groundVertex'),
    fragmentShader: snorb.util.shader('groundFragment'),
    lights: true
  });
  var setRepeat = function(textureKey, value){
    material.uniforms[textureKey].value.repeat.set(value * data.size.x / 100,
                                                   value * data.size.y / 100);
    material.uniforms[textureKey].value.wrapS =
      material.uniforms[textureKey].value.wrapT = THREE.RepeatWrapping;
  };
  setRepeat('texture_rock', 5);
  setRepeat('texture_snow', 2);
  setRepeat('texture_grass', 2);
  setRepeat('texture_bare', 2);

  var geometry = new THREE.PlaneGeometry(
    data.size.x * data.scale,
    data.size.y * data.scale,
    data.size.x,
    data.size.y);
  if(data.altitude instanceof Array){
    for(var i = 0; i < geometry.vertices.length; i++){
      geometry.vertices[i].z = data.altitude[i];
    };
  }else{
    for(var i = 0; i < geometry.vertices.length; i++){
      geometry.vertices[i].z = data.altitude;
    };
  };
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();


  this.object = new THREE.Mesh(geometry, material);
  this.object.rotation.x = -Math.PI / 2;
  this.object.dynamic = true;
  this.object.receiveShadow = true;
  this.object.castShadow = true;
  sceneObj.add( this.object );

};
snorb.core.Terra.prototype = new snorb.core.State();
