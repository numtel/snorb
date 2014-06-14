'use strict';

GAME.core.Scene = function(domElementId, data){
  var that = this;

  this.defaults = {
    camera: {
      position: new THREE.Vector3(-500, 500, 500),
      center: new THREE.Vector3(0, 0, 0)
    }
  };
  data = _.defaults(data || {}, this.defaults);

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
    throw 'Scene element not found!';
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
  var waterNormals = new THREE.ImageUtils.loadTexture('tex/scene/waternormals.jpg');
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
      'tex/scene/sky/px.jpg',
      'tex/scene/sky/nx.jpg',
      'tex/scene/sky/py.jpg',
      'tex/scene/sky/ny.jpg',
      'tex/scene/sky/pz.jpg',
      'tex/scene/sky/nz.jpg'
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

};
GAME.core.Scene.prototype = new GAME.core.State();
