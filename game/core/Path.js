'use strict';

snorb.core.Path = function(terra, data){
  var that = this;

  this.terra = terra;
  this.defaults = {
    start: undefined, // THREE.Vector3
    mid: undefined, // THREE.Vector3
    end: undefined, // THREE.Vector3
    width: 10
  };
  this.data = data = _.defaults(data || {}, this.defaults);

  this.settings = {
    maxAltitudeDisplacement: 50,
    pathHeight: 5,
    bridgeHeight: 5,
    pylonDistance: 50,
    bridgeSideColor: 0xff0000,
    bridgePylonColor: 0x990000,
    bridgeHeightOverWater: 20,
    intersectionHeight: 5,
    intersectionRampLength: 3, // minimum: 2, units: vertex rows
    intersectionMaxRampHeight: 15
  };

  var mesh,
      polygon,
      representation,
      overlappers = [];

  this.reset = function(newData){
    this.data = data = _.defaults(newData || {}, this.defaults);
    this.refresh();
  };
  this.update = function(newData){
    this.data = data = _.defaults(newData || {}, data);
    this.refresh();
  };

  this.isBuildable = function(){
    return true;
  };

  // Private Functions for this.refresh()
  var dumpMesh = function(){
    if(mesh){
      var lastMesh = mesh;
      terra.object.remove(mesh);
      mesh = undefined;
      return lastMesh;
    };
  };
  var getLength = function(){
    if(!that.data.start || !that.data.end || that.data.start.equals(that.data.end)){
      return 0;
    };
    if(that.data.mid){
      return Math.sqrt(Math.pow(that.data.mid.x - that.data.start.x, 2) +
                       Math.pow(that.data.mid.y - that.data.start.y, 2)) +
             Math.sqrt(Math.pow(that.data.end.x - that.data.mid.x, 2) +
                       Math.pow(that.data.end.y - that.data.mid.y, 2));
    };
    return Math.sqrt(Math.pow(that.data.end.x - that.data.start.x, 2) +
                     Math.pow(that.data.end.y - that.data.start.y, 2));
  };
  var buildForm = function(){
    var length = getLength();
    if(length < terra.data.scale){
      return;
    };
    var splinePoints = [that.data.start];
    if(that.data.mid){
      splinePoints.push(that.data.mid);
    };
    splinePoints.push(that.data.end);
    var spline = new THREE.SplineCurve3(splinePoints);
    var pathShapePoints = function(flipCoord){
      var width = that.data.width + that.settings.pathHeight;
      var points = [];
      if(flipCoord){
        points.push(new THREE.Vector2(0, -width / 2));
      }else{
        points.push(new THREE.Vector2(-width / 2, 0));
      };
      var xVal = (-width/2) - terra.data.scale;
      while(xVal !== width /2){
        xVal += terra.data.scale;
        if(xVal > width /2){
          xVal = width /2;
        };
        if(flipCoord){
          points.push(new THREE.Vector2(that.settings.pathHeight, xVal));
        }else{
          points.push(new THREE.Vector2(xVal, that.settings.pathHeight));
        };
      };
      if(flipCoord){
        points.push(new THREE.Vector2(0, width / 2));
      }else{
        points.push(new THREE.Vector2(width / 2, 0));
      };
      return points;
    };
    var shape = new THREE.Shape(pathShapePoints());
    var geometry = new THREE.ExtrudeGeometry(shape, {
      steps: Math.round(length/terra.data.scale),
      bevelEnabled: false,
      extrudePath: spline
    });
    // TODO: Generalize the following temporary fix for paths that are
    //       extruded in a rotation
    if(Math.abs(Math.round(geometry.vertices[2].z - geometry.vertices[1].z)) 
        > that.settings.pathHeight){
      shape = new THREE.Shape(pathShapePoints(true));
      geometry = new THREE.ExtrudeGeometry(shape, {
        steps: Math.round(length/terra.data.scale),
        bevelEnabled: false,
        extrudePath: spline
      });
    };
    return {extrusion: shape, 
            geometry: geometry};
  };
  var buildMesh = function(material){
    var form = buildForm();
    if(!form){
      return;
    };
    if(material === undefined){
      material = new THREE.ShaderMaterial({
        uniforms: {
          texture: {type: 't', value: THREE.ImageUtils.loadTexture(
                    snorb.textureDir + 'path/road.png')},
          highlight: {type: 'v3', value: new THREE.Vector3(0.0, 0.0, 0.0)}
        },
        attributes: {
          translucent: {type: 'f', value: []}
        },
        vertexShader: snorb.util.shader('pathVertex'),
        fragmentShader: snorb.util.shader('pathFragment'),
        transparent: true,
        opacity: 1
      });
    }else{
      material.attributes.translucent.value = [];
    };
    for(var i = 0; i<form.geometry.vertices.length; i++){
      material.attributes.translucent.value.push(1);
    };
    var newMesh = new THREE.Mesh(form.geometry, material);
    newMesh.shapePointsLength = form.extrusion.actions.length;
    newMesh.pathWidth = that.data.width;
    terra.object.add(newMesh);
    return newMesh;
  };
  var generatePolygon = function(){
    if(mesh){
      var vPer = mesh.shapePointsLength;
      var pointArray = [], curV, 
          serialized = [], cSer;
      for(var i = 0; i<mesh.geometry.vertices.length; i++){
        curV = mesh.geometry.vertices[i];
        cSer = curV.x + ',' + curV.y;
        if(serialized.indexOf(cSer) === -1){
          pointArray.push(new THREE.Vector2(curV.x, curV.y));
          serialized.push(cSer);
        };
      };
      var newPolygon = snorb.util.pointsToPolygon(pointArray, terra.data.scale * 2);
      if(newPolygon.length > 2){
        return newPolygon;
      };
    };
  };
  var updateTerraAttributes = function(){
    var attr = terra.object.material.attributes;
    for(var i = 0; i<terra.object.geometry.vertices.length; i++){
      attr.displacement.value[i] = 0;
      attr.translucent.value[i] = 1;
    };
    if(mesh && !representation){
      var coveredVertices = terra.coveredVertices(mesh),
          curV, curCoord, attrVal;
      for(var i = 0; i<coveredVertices.meshCoords.length; i++){
        curV = mesh.geometry.vertices[i];
        curCoord = coveredVertices.meshCoords[i];
        if(curV.z < curCoord.altitude){
          // Do some landscaping...
          _.each(['nw','ne','sw','se'], function(ord){
            if(curCoord[ord]){
              attrVal = terra.object.geometry.vertices[curCoord[ord]].z - curV.z;
              if(attr.displacement.value[curCoord[ord]] < attrVal){
                attr.displacement.value[curCoord[ord]] = attrVal;
              };
              if(curV.z < curCoord.altitude - that.settings.maxAltitudeDisplacement){
                attr.translucent.value[curCoord[ord]] = 0.3;
              };
            };
          });
        };
      };
    };
    attr.displacement.needsUpdate = true;
    attr.translucent.needsUpdate = true;
  };
  var finalizeTerraChanges = function(){
    var vertices = terra.object.geometry.vertices,
        attr = terra.object.material.attributes;
    for(var i = 0; i<vertices.length; i++){
      if(attr.displacement.value[i] > 0 && attr.translucent.value[i] > 0.9){
        vertices[i].z -= attr.displacement.value[i];
      };
      attr.displacement.value[i] = 0;
      attr.translucent.value[i] = 1;
    };
    attr.displacement.needsUpdate = true;
    attr.translucent.needsUpdate = true;
    terra.updateVertices();
  };
  var buildBridges = function(){
    if(!mesh){
      return;
    };
    var boxMesh = function(vertices, isPylon){
      var geometry = new THREE.Geometry(),
          curV, cCoord;
      for(var i = 0; i<vertices.length; i++){
        curV = vertices[i].clone();
        if(isPylon){
          cCoord = terra.coord(curV);
          curV.z = cCoord.altitude;
        }else{
          curV.z -= that.settings.pathHeight + that.settings.bridgeHeight;
        };
        geometry.vertices.push(curV);
      };
      for(var i = 0; i<vertices.length; i++){
        curV = vertices[i].clone();
        curV.z -= that.settings.pathHeight;
        geometry.vertices.push(curV);
      };
      var sideColor = new THREE.Color(isPylon ?
            that.settings.bridgePylonColor : that.settings.bridgeSideColor);
      geometry.faces.push(new THREE.Face3(0,1,4, undefined, new THREE.Color(0x000000)));
      geometry.faces.push(new THREE.Face3(1,5,4, undefined, new THREE.Color(0x000000)));
      geometry.faces.push(new THREE.Face3(3,0,7, undefined, sideColor));
      geometry.faces.push(new THREE.Face3(0,4,7, undefined, sideColor));
      geometry.faces.push(new THREE.Face3(1,2,5, undefined, sideColor));
      geometry.faces.push(new THREE.Face3(2,6,5, undefined, sideColor));
      geometry.faces.push(new THREE.Face3(3,2,6, undefined, new THREE.Color(0x000000)));
      geometry.faces.push(new THREE.Face3(3,6,7, undefined, new THREE.Color(0x000000)));
      geometry.faces.push(new THREE.Face3(4,5,7, undefined, new THREE.Color(0xcccccc)));
      geometry.faces.push(new THREE.Face3(5,7,6, undefined, new THREE.Color(0xcccccc)));
      geometry.faces.push(new THREE.Face3(0,1,3, undefined, new THREE.Color(0x555555)));
      geometry.faces.push(new THREE.Face3(1,3,2, undefined, new THREE.Color(0x555555)));
      geometry.computeFaceNormals();
      var material = new THREE.MeshBasicMaterial({
          vertexColors: THREE.FaceColors,
          side: THREE.DoubleSide
      });
      var newBox = new THREE.Mesh(geometry, material);
      return newBox;
    };
    var vertices = mesh.geometry.vertices,
        cCoord,
        vPer = mesh.shapePointsLength,
        pylonDiv = that.settings.pylonDistance / terra.data.scale * vPer;
    for(var i = vPer; i<vertices.length-vPer; i+=vPer){
      cCoord = terra.coord(vertices[i]);
      if(vertices[i].z > cCoord.altitude){
          mesh.add(boxMesh([vertices[i-vPer], vertices[i-1],
                            vertices[i+vPer - 1], vertices[i]],
                            i % pylonDiv < 2));
      };
    };
  };
  var buildTunnels = function(){
    if(!mesh){
      return;
    };
    var boxMesh = function(vertices){
      var geometry = new THREE.Geometry();
      for(var i = 0; i<vertices.length; i++){
        geometry.vertices.push(vertices[i].clone());
      };
      var curV;
      for(var i = 0; i<vertices.length; i++){
        curV = vertices[i].clone();
        curV.z += 30;
        geometry.vertices.push(curV);
      };
      geometry.faces.push(new THREE.Face3(0,1,4, undefined, new THREE.Color(0x000000)));
      geometry.faces.push(new THREE.Face3(1,5,4, undefined, new THREE.Color(0x000000)));
      geometry.faces.push(new THREE.Face3(3,0,7, undefined, new THREE.Color(0xff0000)));
      geometry.faces.push(new THREE.Face3(0,4,7, undefined, new THREE.Color(0xff0000)));
      geometry.faces.push(new THREE.Face3(1,2,5, undefined, new THREE.Color(0xff0000)));
      geometry.faces.push(new THREE.Face3(2,6,5, undefined, new THREE.Color(0xff0000)));
      geometry.faces.push(new THREE.Face3(3,2,6, undefined, new THREE.Color(0x000000)));
      geometry.faces.push(new THREE.Face3(3,6,7, undefined, new THREE.Color(0x000000)));
      geometry.faces.push(new THREE.Face3(4,5,7, undefined, new THREE.Color(0xcccccc)));
      geometry.faces.push(new THREE.Face3(5,7,6, undefined, new THREE.Color(0xcccccc)));
      geometry.faces.push(new THREE.Face3(0,1,3, undefined, new THREE.Color(0x555555)));
      geometry.faces.push(new THREE.Face3(0,3,2, undefined, new THREE.Color(0x555555)));
      geometry.computeFaceNormals();
      var material = new THREE.MeshBasicMaterial({
          vertexColors: THREE.FaceColors,
          side: THREE.DoubleSide
      });
      var newBox = new THREE.Mesh(geometry, material);
      return newBox;
    };
    var vertices = mesh.geometry.vertices,
        cCoord,
        vPer = mesh.shapePointsLength,
        lastWasTunnel = false;
    for(var i = vPer; i<vertices.length-vPer; i+=vPer){
      cCoord = terra.coord(vertices[i]);
      if(vertices[i].z < cCoord.altitude){
        if(lastWasTunnel === false){
          mesh.add(boxMesh([vertices[i-vPer], vertices[i-1],
                                  vertices[i+vPer - 1], vertices[i]]));
        };
        lastWasTunnel = true;
      }else if(lastWasTunnel === true){
        mesh.add(boxMesh([vertices[i-vPer], vertices[i-1],
                                vertices[i+vPer - 1], vertices[i]]));
        lastWasTunnel = false;
      };
    };
  };

  // Public functions
  this.refresh = function(){
    // Remove old mesh if exists
    var lastMesh = dumpMesh();
    // Build new mesh
    mesh = buildMesh(lastMesh ? lastMesh.material : undefined);
    polygon = generatePolygon();
    updateTerraAttributes();
    buildBridges();
  };
  this.construct = function(){
    if(!mesh || !polygon || representation){
      return;
    };
    finalizeTerraChanges();
    buildTunnels();
    representation = terra.repres.register(polygon);
    representation.mesh = mesh;
    representation.path = that;
    _.extend(representation.data, that.data);
    representation.data.type = 'path2';
    representation.data.rebuildTool = 'path2';
    representation.destroy = that.remove;
    representation.highlight = that.highlight;
  };
  this.remove = function(){
    if(mesh && mesh.parent){
      terra.object.remove(mesh);
    };
  };
  this.highlight = function(color){
    if(!mesh){
      return;
    };
    if(color === undefined){
      color = new THREE.Vector3(0,0,0);
    };
    mesh.material.uniforms.highlight.value.copy(color);
  };


  this.updateIntersections = function(){
    var buildIntersection = function(overlapper){
    };
    var overlap = terra.repres.checkPolygon(that.polygon);
    if(overlap.length){
      for(var i = 0; i<overlap.length; i++){
        if(overlap[i].data.type === 'path'){
          buildIntersection(overlap[i]);
        };
      };
    };
  };


  this.refresh();
};
snorb.core.Path.prototype = new snorb.core.State();

