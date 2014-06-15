'use strict';

snorb.core.Scene = function(domElementId, data){
  var that = this;

  this.defaults = {
    camera: {
      // Read only at run time
      position: new THREE.Vector3(-500, 500, 500),
      center: new THREE.Vector3(0, 100, 0)
    },
    cursor: {
      // Read/write at run time
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

  //this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  
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

  // Add test water surface
  var aMeshMirror = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000, 100, 100), 
    this.water.material
  );
  aMeshMirror.add(this.water);
  aMeshMirror.rotation.x = - Math.PI * 0.5;
  
  this.object.add(aMeshMirror);


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
    //that.controls.update();
    that.display();
  };

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

  requestAnimationFrame(function animate(nowMsec){
    requestAnimationFrame(animate);
    that.update();
  });

  this.curAnim = undefined;
  this.animatePan = function(newPosition){
    if(this.curAnim){
      clearInterval(this.curAnim);
      this.curAnim = undefined;
    }
    var prop = 1,
        origObject = {x: that.data.camera.position.x,
                      y: that.data.camera.position.y,
                      z: that.data.camera.position.z},
        origCenter = {x: that.data.camera.center.x,
                      y: that.data.camera.center.y,
                      z: that.data.camera.center.z},
        animFunction = function(){
          var nowPosition = {}, nowCenter = {};
          for(var i in origObject){
            if(origObject.hasOwnProperty(i)){
              nowPosition[i] = origObject[i] + (newPosition[i] * 
                Math.sin(Math.PI/2*(1-prop)));
              nowCenter[i] = origCenter[i] + (newPosition[i] * 
                Math.sin(Math.PI/2*(1-prop)));
            };
          };
          that.camera.position.copy(nowPosition);
          that.camera.lookAt(nowCenter);
          that.data.camera.position = nowPosition;
          that.data.camera.center = nowCenter;
          if(prop === 0){
            clearInterval(that.curAnim);
            that.curAnim = undefined;
          }else{
            prop *= 0.5;
            if(prop < 0.01){
              prop = 0;
            }
          }
        };
    animFunction();
    that.curAnim = setInterval(animFunction, 30);
  };

  this.pan = function (pos, terra) {
    this.animatePan({x: terra.object.position.x + pos.x - this.data.camera.center.x,
                     y: terra.object.position.y + pos.z - this.data.camera.center.y,
                     z: terra.object.position.z - pos.y - this.data.camera.center.z});
  };


  // Tools
  this.terra = [];
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
  var mouseHandler = function(specific){
    return function(event){
      var point = snorb.util.mouseIntersect(
                    event.clientX, event.clientY,
                    that.terra, that.camera),
          curTerra;
      if(point.length){
        curTerra = point[0].object.terra;
      };
      _.each(that.terra, function(terraMesh){
        if(curTerra !== terraMesh.terra){
          // Hide cursor on inactive terras
          terraMesh.terra.setCursor(undefined, false);
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
  that.domElement.addEventListener('contextmenu', 
    function (event) { event.preventDefault(); }, false );
  
  var onMouseWheel =  function onMouseWheel( event ) {
    var delta = 0, 
        diff = new THREE.Vector3(
            (data.camera.position.x - data.camera.center.x)/4,
            (data.camera.position.y - data.camera.center.y)/4,
            (data.camera.position.z - data.camera.center.z)/4
          );
    if(event.wheelDelta){ // WebKit / Opera / Explorer 9
      delta = event.wheelDelta;
    }else if(event.detail ){ // Firefox
      delta = - event.detail;
    };
    if(delta > 0){
      if(diff.y < 10){
        // You are too zoomed!
        return;
      };
      data.camera.position.x -= diff.x;
      data.camera.position.y -= diff.y;
      data.camera.position.z -= diff.z;
    }else{
      if(data.camera.position.y > 2000){
        // Too far!
        return;
      };
      data.camera.position.x += diff.x;
      data.camera.position.y += diff.y;
      data.camera.position.z += diff.z;
    };
    that.camera.position.copy(data.camera.position);
    that.camera.lookAt(data.camera.center);
  }
  that.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
  that.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

};
snorb.core.Scene.prototype = new snorb.core.State();
