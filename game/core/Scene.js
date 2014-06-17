'use strict';

snorb.core.Scene = function(domElementId, data){
  var that = this;

  this.defaults = {
    camera: {
      position: new THREE.Vector3(-500, 500, 500),
      center: new THREE.Vector3(0, 100, 0)
    },
    cursor: {
      radius: 100,
      visible: false
    }
  };
  this.data = data = _.defaults(data || {}, this.defaults);

  this.supportWebGL = function(){
    try{
      var aCanvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (aCanvas.getContext('webgl') || aCanvas.getContext('experimental-webgl')));
    }catch(e){
      return false;
    };
  };

  // initialize
  if(!this.supportWebGL()){
    throw 'WebGL not supported!';
  };
  this.domElement = document.getElementById(domElementId);
  if(!this.domElement){
    throw 'Element not found!';
  };

  this.renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  this.domElement.appendChild(this.renderer.domElement);

  this.object = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  this.camera = new THREE.PerspectiveCamera(55, aspectRatio, 0.5, 3000000);
  this.camera.position.copy(data.camera.position);
  this.camera.lookAt(data.camera.center);

  this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  data.camera.center = this.controls.center;
  data.camera.position = this.camera.position;
  
  // Add light
  var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(-20, 500, 20);
  directionalLight.castShadow = true;
  directionalLight.shadowCameraNear = 100;
  directionalLight.shadowCameraFar = 2500;
  directionalLight.shadowBias = 0.0001;
  directionalLight.shadowDarkness = 0.35;
  directionalLight.shadowMapWidth = 1024; //512px by default
  directionalLight.shadowMapHeight = 1024;
  this.object.add(directionalLight);
  
  // Create the water effect
  var waterNormals = new THREE.ImageUtils.loadTexture('textures/scene/waternormals.jpg');
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping; 
  this.water = new THREE.Water(this.renderer, this.camera, this.object, {
    textureWidth: 256,
    textureHeight: 256,
    waterNormals: waterNormals,
    alpha:  1.0,
    sunDirection: directionalLight.position.normalize(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    betaVersion: 0,
    side: THREE.DoubleSide
  });

  // Create skybox
  this.skybox = (function(){
    var cubeMap = THREE.ImageUtils.loadTextureCube([
      'textures/scene/sky/px.jpg',
      'textures/scene/sky/nx.jpg',
      'textures/scene/sky/py.jpg',
      'textures/scene/sky/ny.jpg',
      'textures/scene/sky/pz.jpg',
      'textures/scene/sky/nz.jpg'
    ]);
    cubeMap.format = THREE.RGBFormat;

    var shader = THREE.ShaderLib['cube'];
    shader.uniforms['tCube'].value = cubeMap;

    var material = new THREE.ShaderMaterial({
      fragmentShader: shader.fragmentShader,
      vertexShader: shader.vertexShader,
      uniforms: shader.uniforms,
      depthWrite: false,
      side: THREE.BackSide
    });

    return new THREE.Mesh(new THREE.CubeGeometry(1000000, 1000000, 1000000), material);
  })();
  this.object.add(this.skybox);

  this.display = function(){
    that.water.render();
    that.renderer.render(that.object, that.camera);
  };

  this.update = function(){
    that.water.material.uniforms.time.value += 1.0 / 60.0;
    that.controls.update();
    that.display();
  };

  requestAnimationFrame(function animate(nowMsec){
    requestAnimationFrame(animate);
    that.update();
  });

  this.resize = function(){
    that.camera.aspect = window.innerWidth / window.innerHeight;
    that.camera.updateProjectionMatrix();
    that.renderer.setSize(window.innerWidth, window.innerHeight);
    that.domElement.replaceChild(that.domElement.children[0],
                                 that.renderer.domElement);
    that.display();
  };

  window.addEventListener('resize', this.resize, false);
  this.resize();

  // Tools
  this.terraMesh = [];
  this.tools = {};
  _.each(snorb.tools, function(tool, toolKey){
    that.tools[toolKey] = new tool(that);
  });
  var activeTool = undefined;

  this.setTool = function(toolKey){
    if(this.activeTool){
      this.activeTool.deselect();
    }
    this.activeTool = this.tools[toolKey];
    if(this.activeTool){
      this.activeTool.select();
    }
  };

  // Mouse Events
  var activePanInterval;
  this.pan = function (pos, terra) {
    var animatePan = function(newPosition){
      if(activePanInterval){
        clearInterval(activePanInterval);
        activePanInterval = undefined;
      }
      var prop = 1,
          origObject = {x: that.data.camera.position.x,
                        y: that.data.camera.position.y,
                        z: that.data.camera.position.z},
          origCenter = {x: that.data.camera.center.x,
                        y: that.data.camera.center.y,
                        z: that.data.camera.center.z},
          animFunction = function(){
            var nowPosition = new THREE.Vector3(0, 0, 0),
                nowCenter = new THREE.Vector3(0, 0, 0);
            for(var i in origObject){
              if(origObject.hasOwnProperty(i)){
                nowPosition[i] = origObject[i] + (newPosition[i] * 
                  Math.sin(Math.PI/2*(1-prop)));
                nowCenter[i] = origCenter[i] + (newPosition[i] * 
                  Math.sin(Math.PI/2*(1-prop)));
              };
            };
            that.camera.position.copy(nowPosition);
            that.controls.center.copy(nowCenter);
            if(prop === 0){
              clearInterval(activePanInterval);
              activePanInterval = undefined;
            }else{
              prop *= 0.5;
              if(prop < 0.01){
                prop = 0;
              }
            }
          };
      animFunction();
      activePanInterval = setInterval(animFunction, 30);
    };
    animatePan({x: terra.object.position.x + pos.x - this.data.camera.center.x,
               y: terra.object.position.y + pos.z - this.data.camera.center.y,
               z: terra.object.position.z - pos.y - this.data.camera.center.z});
  };


  this.projector = new THREE.Projector();
  this.mouseIntersect = function(x, y, object){
    var vector = new THREE.Vector3(
        ( x / window.innerWidth ) * 2 - 1,
        - ( y / window.innerHeight ) * 2 + 1,
        0.5 );
    that.projector.unprojectVector(vector, that.camera);

    var dir = vector.sub(that.camera.position).normalize();
    var ray = new THREE.Raycaster(that.camera.position.clone(), dir);
    if(object instanceof Array){
      return ray.intersectObjects(object);
    }else{
      return ray.intersectObject(object);
    }
  };

  var mouseHandler = function(specific){
    return function(event){
      var point = that.mouseIntersect(event.clientX, event.clientY, that.terraMesh),
          curTerra;
      if(point.length){
        curTerra = point[0].object.terra;
      };
      _.each(that.terraMesh, function(terraMesh){
        if(curTerra !== terraMesh.terra){
          // Hide cursor on inactive terras
          terraMesh.terra.setCursor(undefined, false);
          if(event.button !== 2){
            if(that.activeTool){
              that.activeTool[specific](undefined, terraMesh.terra, event);
            };
          };
        }else{
          var terraPos = new THREE.Vector3(point[0].point.x,
                                          -point[0].point.z,
                                          point[0].point.y);
          if(event.button === 2){
            if(specific === 'mousedown'){
              that.pan(terraPos, curTerra);
            };
          }else{
            if(that.activeTool){
              that.activeTool[specific](terraPos, terraMesh.terra, event);
            };
          };
          terraMesh.terra.setCursor(terraPos, that.data.cursor.visible,
                                    that.data.cursor.radius);
        };
      });
    };
  };
  _.each(['mousemove', 'mousedown', 'mouseup'], function(specific){
    that.domElement.addEventListener(specific, mouseHandler(specific), false);
  });

  this.prepareData = function(){
    var output = {
      camera: {
        position: this.data.camera.position.clone(),
        center: this.data.camera.center.clone()
      },
      cursor: _.clone(this.data.cursor),
      tools: {},
      terra: []
    }
    _.each(this.tools, function(tool, key){
      output.tools[key] = tool.prepareData();
    });
    _.each(this.terraMesh, function(terraMesh){
      output.terra.push(terraMesh.terra.prepareData());
    });
    return output;
  };

  this.addTerra = function(data){
    return new snorb.core.Terra(this, data);
  };

  this.removeTerra = function(terra){
    var index = this.terraMesh.indexOf(terra.object);
    terra.destroy();
    this.object.remove(terra.object);
    this.terraMesh.splice(index, 1);
  };

  this.reset = function(data){
    var curTerra;
    while(this.terraMesh.length){
      curTerra = this.terraMesh.pop();
      curTerra.terra.destroy();
      that.object.remove(curTerra);
    };
    this.setTool(undefined);
    that.data.cursor = _.clone(that.defaults.cursor);

    if(data !== undefined){
      _.each(data.tools, function(toolData, key){
        that.tools[key].reset(toolData);
      });
      _.each(data.terra, function(terraData){
        that.addTerra(terraData);
      });
      that.data.camera.position.copy(data.camera.position);
      that.data.camera.center.copy(data.camera.center);
    }else{
      _.each(that.tools, function(tool, key){
        tool.reset();
      });
      that.data.camera.position.copy(that.defaults.camera.position);
      that.data.camera.center.copy(that.defaults.camera.center);
    };
  };

};
snorb.core.Scene.prototype = new snorb.core.State();
