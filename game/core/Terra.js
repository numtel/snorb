'use strict';

snorb.core.Terra = function(scene, data){
  var that = this;

  this.scene = scene;

  this.defaults = {
    size: new THREE.Vector2(150, 100),
    position: new THREE.Vector3(0, 0, 0),
    scale: 10,
    altitude: 100,
    minAlt: 0,
    maxAlt: 300
  };
  this.data = data = _.defaults(data || {}, this.defaults);

  // Private Methods
  var getIndex = function(pos){
    var xStart = -that.data.size.x * that.data.scale / 2,
        yStart = that.data.size.y * that.data.scale / 2,
        vertexIndex = Math.round((pos.x - xStart) / that.data.scale) +
          (-Math.round((pos.y - yStart) / that.data.scale) * (that.data.size.x+1));
    if(pos.x < xStart || 
       pos.x > -xStart || 
       vertexIndex >= ((that.data.size.x + 1) * (that.data.size.y + 1)) || 
       vertexIndex < 0){
      // off terrain
      return undefined;
    }
    return vertexIndex;
  };


  // Public Methods
  this.buildSides=function(){
    var sideRanges = [
      [0, that.data.size.x+1, 1, 'x', 1, -1],
      [0, ((that.data.size.x+1) * (that.data.size.y+1)), 
        that.data.size.x+1, 'y', 1, 1],
      [((that.data.size.x+1) * (that.data.size.y+1))-that.data.size.x-1, 
        ((that.data.size.x+1) * (that.data.size.y+1)), 1, 'x', -1, -1],
      [that.data.size.x, ((that.data.size.x+1) * (that.data.size.y+1)), 
        that.data.size.x+1, 'y', -1, 1]],
      sideMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x333333),
        side: THREE.DoubleSide,
        wireframe:false}),
      waterMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x334337),
        side: THREE.DoubleSide,
        transparent: true,
        opacity:0.8}),
      bottomMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x111111),
        side: THREE.BackSide,
        wireframe:false}),
      vertices = geometry.vertices,
      sidePoints, sideWaterPoints, curV, inWater,
      newSides = [], curSide, curSideMesh, curWaterSide, curWaterMesh;
    for(var i=0;i<sideRanges.length;i++){
      // determine points on this side
      sidePoints = [];
      sideWaterPoints = [];
      inWater = false;
      for(var v=sideRanges[i][0];v<sideRanges[i][1];v+=sideRanges[i][2]){
        curV = vertices[v];
        sidePoints.push({x:curV[sideRanges[i][3]],y:curV.z});
        /*if(curV.waterAlt){
          if(!inWater){
            sideWaterPoints.push([]);
          }
          sideWaterPoints[sideWaterPoints.length-1].push({
            x:curV[sideRanges[i][3]],
            y: curV.waterAlt ? curV.waterAlt : curV.z,
            z: curV.z});
          inWater = true;
        }else{
          inWater=false;
        }*/
      };
      if(sideRanges[i][3] === 'y'){
        sidePoints.push({x:-that.data.size.y * that.data.scale / 2 * sideRanges[i][5], 
                         y: that.data.minAlt});
        sidePoints.push({x:that.data.size.y * that.data.scale / 2 * sideRanges[i][5], 
                         y: that.data.minAlt});
      } else {
        sidePoints.push({x:-that.data.size.x * that.data.scale / 2 * sideRanges[i][5], 
                         y: that.data.minAlt});
        sidePoints.push({x:that.data.size.x * that.data.scale / 2 * sideRanges[i][5], 
                         y: that.data.minAlt});
      }
      // build main side skirt
      curSide = new THREE.Shape();
      for(var h = 0; h<sidePoints.length; h++){
        curV = sidePoints[h];
        if(h === 0){
          curSide.moveTo(curV.x, curV.y);
        } else {
          curSide.lineTo(curV.x, curV.y);
        }
      }
      curSideMesh = new THREE.Mesh(new THREE.ShapeGeometry(curSide), sideMaterial);
      that.object.add(curSideMesh);
      curSideMesh.rotation.x=Math.PI/2;
      if(sideRanges[i][3]==='y'){
        curSideMesh.rotation.y=Math.PI/2;
        curSideMesh.position.x=-that.data.size.x * that.data.scale / 2 * sideRanges[i][4];
      }else{
        curSideMesh.position.y=that.data.size.y * that.data.scale / 2 * sideRanges[i][4];
      }
      newSides.push(curSideMesh);
/*
      //build each water side skirt
      for(var w = 0; w<sideWaterPoints.length; w++){
        curWaterSide = new THREE.Shape();
        for(var h = 0; h<sideWaterPoints[w].length; h++){
          curV = sideWaterPoints[w][h];
          if(h === 0){
            curWaterSide.moveTo(curV.x, curV.y);
          } else {
            curWaterSide.lineTo(curV.x, curV.y);
          }
        }
        for(var h = sideWaterPoints[w].length-1; h>-1; h--){
          curV = sideWaterPoints[w][h];
          if(curV.z<curV.y){
            curWaterSide.lineTo(curV.x, curV.z);
          }
        }
        curWaterMesh = new THREE.Mesh(new THREE.ShapeGeometry(curWaterSide), waterMaterial);
        ground.add(curWaterMesh);
        curWaterMesh.rotation.x=Math.PI/2;
        if(sideRanges[i][3]==='y'){
          curWaterMesh.rotation.y=Math.PI/2;
          curWaterMesh.position.x=-groundParams.w/2*sideRanges[i][4];
          curWaterMesh.position.x+=0.01*sideRanges[i][4];
        }else{
          curWaterMesh.position.y=groundParams.w/2*sideRanges[i][4];
          curWaterMesh.position.y-=0.01*sideRanges[i][4];
        }
        newSides.push(curWaterMesh);
      }*/
    }
    // add bottom
    curSideMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(that.data.size.x * that.data.scale,
                              that.data.size.y * that.data.scale),
      bottomMaterial);
    that.object.add(curSideMesh);
    newSides.push(curSideMesh);
    //remove old sides
    if(that.sides){
      for(var i=0;i<that.sides.length;i++){
        that.object.remove(that.sides[i]);
      }
    }
    that.sides = newSides;
  };

  this.coord = function(pos){
    var x = pos.x, y = pos.y,
        xR10 = x - (x % this.data.scale),
        yR10 = y - (y % this.data.scale),
        xW = x < 0 ? xR10 - this.data.scale : xR10,
        xE = xW + this.data.scale,
        yN = y < 0 ? yR10 - this.data.scale : yR10,
        yS = yN + this.data.scale,
        propY = (y-yN) / this.data.scale,
        propX = (x-xW) / this.data.scale,
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
    if(originIndex === undefined){
      return [];
    };
    var vertices = geometry.vertices,
        output = [],
        curRadius = 0,
        lenX = that.data.size.x + 1,
        lenY = that.data.size.y + 1,
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
    this.buildSides();
  };

  this.isCursorVisible = function(){
    return !! material.uniforms.show_ring.value;
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
      scene.terraMesh.splice(scene.terraMesh.indexOf(this.object), 1);
    };
    geometry = new THREE.PlaneGeometry(
      this.data.size.x * this.data.scale,
      this.data.size.y * this.data.scale,
      this.data.size.x,
      this.data.size.y);
    if(data.altitude instanceof Array){
      for(var i = 0; i < geometry.vertices.length; i++){
        geometry.vertices[i].z = this.data.altitude[i];
      };
    }else{
      for(var i = 0; i < geometry.vertices.length; i++){
        geometry.vertices[i].z = this.data.altitude;
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
    this.buildSides();
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
      this.data = _.defaults(data, this.defaults);
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
    scene.tools[data.rebuildTool].rebuild(this, data);
  };

  this.repres = new snorb.core.Represent(this, _.clone(data.repres));
  this.repres.buildObjectsInData();

};
snorb.core.Terra.prototype = new snorb.core.State();
