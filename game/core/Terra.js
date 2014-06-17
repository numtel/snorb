'use strict';

snorb.core.Terra = function(scene, data){
  var that = this;

  this.defaults = {
    size: new THREE.Vector2(150, 100),
    position: new THREE.Vector3(0, 0, 0),
    scale: 10,
    altitude: 100
  };
  this.data = data = _.defaults(data || {}, this.defaults);

  // Private Methods
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


  // Public Methods
  this.adjustWaterLevel = function(pos, amount){
    var findWaterSurfaceVertices = function(originIndex, waterAlt){
      // use nearbyVertices to determine which vertices exist
      // contiguously with the given water depth
      var vertices = geometry.vertices,
          insideIndent = [originIndex],
          alreadyLooked = [],
          curIndex, neighbors;
      while(insideIndent.length > 0){
        curIndex = insideIndent.pop();
        alreadyLooked.push(curIndex);
        neighbors = that.nearbyVertices(curIndex,1);
        for(var i = 0; i<neighbors[0].length; i++){
          if(vertices[neighbors[0][i]].z<waterAlt && 
              alreadyLooked.indexOf(neighbors[0][i]) === -1 &&
              insideIndent.indexOf(neighbors[0][i]) === -1){
            insideIndent.push(neighbors[0][i]);
          }else if(vertices[neighbors[0][i]].z>=waterAlt &&
              alreadyLooked.indexOf(neighbors[0][i]) === -1){
            alreadyLooked.push(neighbors[0][i]);
          };
        };
      };
      return alreadyLooked;
    };
    var coord = this.coord(pos),
        curLevel = coord.altitude;
    // Find current water level
    _.each(coord.objects, function(obj){
      if(obj.data.type === 'water'){
        curLevel = obj.data.altitude;
      };
    });
    var newLevel = curLevel + amount,
        indentVertices = findWaterSurfaceVertices(coord.anyVI, newLevel),
        convexHull = new ConvexHull(),
        curV, allPoints = [],
        waterShape = new THREE.Shape();

    if(indentVertices.length < 2){
      return;
    };
    
    for(var i = 0; i<indentVertices.length; i++){
      curV = geometry.vertices[indentVertices[i]];
      allPoints.push({x: curV.x, y: curV.y});
    };
    convexHull.compute(allPoints);
    var hullPoints = convexHull.getIndices(),
        footprint = [];
    for(var i = 0; i<hullPoints.length; i++){
      curV = allPoints[hullPoints[i]];
      footprint.push(new THREE.Vector2(curV.x, curV.y));
      if(i === 0){
        waterShape.moveTo(curV.x, curV.y);
      } else {
        waterShape.lineTo(curV.x, curV.y);
      };
    };
    var overlap = that.repres.checkPolygon(footprint),
        isOnlyWater = true;
    for(var i = 0; i<overlap.length; i++){
      if(overlap[i].data.type !== 'water'){
        isOnlyWater = false;
      };
    };
    if(!isOnlyWater){
      return false;
    };
    var oldWater;
    while(overlap.length){
      oldWater = overlap.pop();
      oldWater.remove();
    };
   
    if(newLevel < coord.altitude){
      return true;
    };
 
    var waterGeometry = new THREE.ShapeGeometry(waterShape),
        waterMesh = new THREE.Mesh(waterGeometry, scene.water.material);
    waterMesh.position.y = newLevel;
    waterMesh.add(scene.water.clone());
    waterMesh.rotation.x = -Math.PI * 0.5;
    scene.object.add(waterMesh);
    var representation = that.repres.register(footprint);
    representation.mesh = waterMesh;
    representation.data.type = 'water';
    representation.data.altitude = newLevel;
    representation.data.depthAtPos = newLevel - coord.altitude;
    representation.data.pos = pos.clone();
    representation.destroy = function(){
      scene.object.remove(this.mesh);
    };
    return true;
  };

  this.coord = function(pos){
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
    var anyVI;
    if(viNW !== undefined){
      anyVI = viNW;
    }else if(viNE !== undefined){
      anyVI = viNE;
    }else if(viSW !== undefined){
      anyVI = viSW;
    }else if(viSE !== undefined){
      anyVI = viSE;
    }
    return {nw: viNW,
            ne: viNE,
            sw: viSW,
            se: viSE,
            anyVI: anyVI,
            propNS: propY,
            propWE: propX,
            altitude: altitude,
            objects: that.repres.checkPoint(pos)};
  };

  this.nearbyVertices=function(pos, radius){
    var originIndex;
    if(typeof pos === 'number'){
      originIndex = pos;
    }else{
      var coord = that.coord(pos);
      originIndex  = coord.anyVI;
    }
    var vertices = geometry.vertices,
        output = [],
        curRadius = 0,
        lenX = data.size.x + 1,
        lenY = data.size.y + 1,
        getNeighbors = function(index){
          var output = [];
          // top row
          if(index % lenX > 0){
            // left
            if(index > lenX) {
              output.push(index - lenX - 1);
            }
            // middle
            output.push(index - 1);
            // right
            if(index + lenX < lenX * lenY){
              output.push(index + lenX - 1);
            }
          }
          // middle row
          // left
          if(index > lenX) {
            output.push(index - lenX);
          }
          // right
          if(index + lenX < lenX * lenY){
            output.push(index + lenX);
          }
          // bottom row
          if(index % lenX < lenX - 1){
            // left
            if(index > lenX) {
              output.push(index - lenX + 1);
            }
            // middle
            output.push(index + 1);
            // right
            if(index + lenX + 1 < lenX * lenY){
              output.push(index + lenX + 1);
            }
          }
          return output;
        },
        foundAlready = function(output, index){
          for(var i = 0; i<output.length;i++){
            if(output[i].indexOf(index)!==-1){
              return true;
            }
          }
          return false;
        },
        i, j, neighbors, newNeighbors;
    while(curRadius<radius){
      if(curRadius === 0){
        output.push(getNeighbors(originIndex));
        output[0].push(originIndex);
      } else {
        newNeighbors = [];
        for(i = 0; i<output[curRadius-1].length; i++){
          neighbors = getNeighbors(output[curRadius-1][i]);
          for(j = 0; j<neighbors.length; j++){
            if(neighbors[j] !== undefined &&
                neighbors[j] !== originIndex &&
                !foundAlready(output, neighbors[j]) &&
                newNeighbors.indexOf(neighbors[j]) === -1){
              newNeighbors.push(neighbors[j]);
            }
          }
        }
        output.push(newNeighbors);
      }
      curRadius++;
    }
    return output;
  };

  this.updateVertices = function(){
    geometry.verticesNeedUpdate=true;
    geometry.normalsNeedUpdate = true;
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
  };

  this.setCursor = function(pos, visible, radius, color){
    if(pos !== undefined){
      // Vec3
      material.uniforms.ring_center.value.x = pos.x;
      material.uniforms.ring_center.value.y = pos.y;
      material.uniforms.ring_center.value.z = pos.z;
    }
    if(visible !== undefined){
      // Boolean
      material.uniforms.show_ring.value = visible;
    }
    if(radius !== undefined){
      // Boolean
      material.uniforms.ring_radius.value = radius;
    }
    if(color !== undefined){
      // Color is Vec4 RGBA
      material.uniforms.ring_color.value = color;
    }
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
      shadowMatrix: { type: "m4v", value: [] },

      show_ring: { type: 'i', value: false },
      ring_width: { type: 'f', value: 5.0 },
      ring_color: { type: 'v4', value: new THREE.Vector4(0.0, 0.0, 0.7, 1.0) },
      ring_center: { type: 'v3', value: new THREE.Vector3() },
      ring_radius: { type: 'f', value: 50.0 }
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

  var geometry;

  this.rebuildMesh = function(){
    if(this.object){
      scene.object.remove(this.object);
      delete scene.terraMesh[scene.terraMesh.indexOf(this.object)];
    };
    geometry = new THREE.PlaneGeometry(
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
    this.object.position.copy(data.position);
    data.position = this.object.position;
    this.object.dynamic = true;
    this.object.receiveShadow = true;
    this.object.castShadow = true;
    this.object.terra = this;

    scene.object.add(this.object);
    scene.terraMesh.push(this.object);
  };
  this.rebuildMesh();

  this.prepareData = function(){
    var output = _.clone(this.data);
    output.altitude = [];
    for(var i = 0; i<geometry.vertices.length; i++){
      output.altitude.push(geometry.vertices[i].z);
    };

    output.repres = this.repres.prepareData();
    return output;
  };

  this.reset = function(data){
    if(data){
      this.repres.reset(data.repres);
      delete data.repres;
    }else{
      this.repres.reset();
      this.data = _.clone(this.defaults);
    };
    this.rebuildMesh();
  };

  this.destroy = function(){
    // Remove all objects explicitly as some are not children of this mesh
    this.repres.reset();
  };

  this.buildObject = function(data){
    if(data.type === 'water'){
      this.adjustWaterLevel(data.pos, data.depthAtPos);
    }else{
      console.log(data);
    }
  };

  this.repres = new snorb.core.Represent(this, _.clone(data.repres));
  this.repres.buildObjectsInData();

};
snorb.core.Terra.prototype = new snorb.core.State();
