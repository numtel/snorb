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
    snapRadius: 20,
    intersectionHeight: 5,
    intersectionRampLength: 3, // minimum: 2, units: vertex rows
    intersectionMaxRampHeight: 15
  };


  var pointKeys = ['start', 'mid', 'end'];

  var mesh,
      polygon,
      representation,
      overlappers = [],
      intersections = [],
      overlappingIntersections = [];

  // Private Functions
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
    var pathShapePoints = function(flipCoord, flipHeight){
      var width = that.data.width + that.settings.pathHeight,
          height = that.settings.pathHeight * (flipHeight ? -1 : 1);
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
          points.push(new THREE.Vector2(height, xVal));
        }else{
          points.push(new THREE.Vector2(xVal, height));
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
    }else if(geometry.vertices[2].z > splinePoints[0].z){
      shape = new THREE.Shape(pathShapePoints(false, true));
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
      var newPolygon = snorb.util.pointsToPolygonGPC(pointArray, terra.data.scale * 2);
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
        lastWasTunnel = false,
        normalize = function(vi){
          if(vi < 0){
            return 0;
          }else if(vi > vertices.length-1){
            return vertices.length - 1;
          };
          return vi;
        };
    for(var i = vPer; i<vertices.length-vPer; i+=vPer){
      cCoord = terra.coord(vertices[i]);
      if(vertices[i].z < cCoord.altitude){
        if(lastWasTunnel === false){
          mesh.add(boxMesh([vertices[normalize(i-vPer-vPer)], 
                            vertices[normalize(i-vPer-1)],
                            vertices[normalize(i + vPer + vPer - 1)], 
                            vertices[normalize(i + vPer)]]));
        };
        lastWasTunnel = true;
      }else if(lastWasTunnel === true){
        mesh.add(boxMesh([vertices[normalize(i-vPer-vPer)], 
                          vertices[normalize(i-vPer-1)],
                          vertices[normalize(i+vPer+vPer - 1)], 
                          vertices[normalize(i+vPer)]]));
        lastWasTunnel = false;
      };
    };
  };
  var ensureDataTypes = function(){
    _.each(pointKeys, function(key){
      // Check for THREE.Vector3
      if(that.data[key] && !that.data[key].__proto__.hasOwnProperty('equals')){
        that.data[key] = (new THREE.Vector3()).copy(that.data[key]);
      };
    });
  };
  var snapEnds = function(){
    // find overlapping paths within x distance from start and end points
    // and adjust the points
    var endKeys = ['start', 'end'];
    endKeys.forEach(function(key){
      // that.data.snapRadius
      var cPos = that.data[key],
          radius = that.settings.snapRadius;
      if(cPos === undefined){
        return;
      };
      var testPoly = [
        {x: cPos.x - radius, y: cPos.y - radius},
        {x: cPos.x - radius, y: cPos.y + radius},
        {x: cPos.x + radius, y: cPos.y + radius},
        {x: cPos.x + radius, y: cPos.y - radius},
      ];
      var dist = function(vertex){
        return Math.sqrt(
                Math.pow(cPos.x - vertex.x, 2) + 
                Math.pow(cPos.y - vertex.y, 2) + 
                Math.pow(cPos.z - vertex.z, 2));
      };
      var overlap = terra.repres.checkPolygon(testPoly),
          closeDist, closePos;
      overlap.forEach(function(overlapper){
        if(overlapper.data.type === 'path'){
          // find close end
          endKeys.forEach(function(cEnd){
            var cDist = dist(overlapper.data[cEnd]);
            if(cDist < radius){
              that.data[key].copy(overlapper.data[cEnd]);
            };
          });
        };
      });
    });
  };
  var didXYChange = function(a, b){
    var changed = false;
    _.each(pointKeys, function(key){
      if(!a[key] || !b[key] || a[key].x !== b[key].x || a[key].y !== b[key].y){
        changed = true;
      };
    });
    return changed;
  };

  // Public methods
  this.reset = function(newData){
    this.data = data = _.defaults(newData || {}, this.defaults);
    this.refresh(true);
  };
  this.update = function(newData){
    var updatePolygon = didXYChange(newData, data);
    this.data = data = _.defaults(newData || {}, data);
    this.refresh(updatePolygon);
  };

  this.isBuildable = function(){
    return true;
  };

  this.refresh = function(updatePolygon){
    ensureDataTypes();
    snapEnds();
    // Remove old mesh if exists
    var lastMesh = dumpMesh();
    // Build new mesh
    mesh = buildMesh(lastMesh ? lastMesh.material : undefined);
    if(updatePolygon){
      polygon = generatePolygon();
    };
    updateTerraAttributes();
    buildBridges();
    that.updateIntersections();
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
    representation.data.type = 'path';
    representation.data.rebuildTool = 'path';
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

  this.resetOverlappingIntersections = function(performRemoval){
    for(var i=0; i<overlappingIntersections.length; i++){
      if(performRemoval){
        overlappingIntersections[i].remove();
      }else{
        overlappingIntersections[i].mesh.visible=true;
      };
    };
    overlappingIntersections = [];
  };


  this.updateIntersections = function(){
    var buildIntersection = function(overlapper){
      var overlappingVertices = function(mesh, meshPolygon, overlapper){
        var inMesh = [], inOverlapper = [];
        for(var i = 0; i<mesh.geometry.vertices.length; i++){
          if(window.polygon.pointInside(
              mesh.geometry.vertices[i].clone(),
              overlapper.polygon, true)){
            inMesh.push(i);
          };
        };
        for(var i = 0; i<overlapper.mesh.geometry.vertices.length; i++){
          if(window.polygon.pointInside(
              overlapper.mesh.geometry.vertices[i].clone(),
              meshPolygon, true)){
            inOverlapper.push(i);
          };
        };
        return {mesh: inMesh, overlap: inOverlapper};
      };
      var vertexRows = function(mesh, vertices){
        var rowV = [], curR;
        for(var i = 0; i<vertices.length; i++){
          curR = vertices[i] - (vertices[i] % mesh.shapePointsLength);
          if(rowV.indexOf(curR) === -1){
            rowV.push(curR);
          };
        };
        if(rowV.length===1 && rowV[0] !== 0 &&
            rowV[0] < mesh.geometry.vertices.length - mesh.shapePointsLength){
          rowV.push(rowV[0] + mesh.shapePointsLength);
        };
        return rowV;
      };
      var findAltRange = function(mesh, vertexRows){
        var min, max, curV;
        for(var r = 0; r<vertexRows.length; r++){
          for(var i = 0; i<mesh.shapePointsLength; i++){
            curV = mesh.geometry.vertices[vertexRows[r]+i];
            if(max === undefined || curV.z > max){
              max = curV.z;
            };
            if(min === undefined || curV.z < min){
              min = curV.z;
            };
          };
        };
        return {min: min, max: max};
      };
      that.resetOverlappingIntersections();
      if(!mesh || !polygon || polygon.length < 3){
        return;
      };
      var overlapV = overlappingVertices(mesh, polygon, overlapper),
          meshVR = vertexRows(mesh, overlapV.mesh),
          overlapVR = vertexRows(overlapper.mesh, overlapV.overlap);

      if(meshVR.length === 0 || overlapVR.length === 0){
        return;
      };

      var meshAlt = findAltRange(mesh, meshVR);
      var overlapAlt = findAltRange(overlapper.mesh, overlapVR);
      var maxAlt = meshAlt.max > overlapAlt.max ? meshAlt.max : overlapAlt.max;
      var minAlt = meshAlt.min < overlapAlt.min ? meshAlt.min : overlapAlt.min;
      if(Math.abs(minAlt - maxAlt) > that.settings.intersectionMaxRampHeight){
        // No Intersection if altitude difference too great
        return;
      };

      //add ramps to intersection
      var origMeshVR = _.clone(meshVR),
          origOverlapVR = _.clone(overlapVR),
          centerMeshVR,
          centerOverlapVR,
          minOverlapVR = _.min(overlapVR),
          maxOverlapVR = _.max(overlapVR),
          minMeshVR = _.min(meshVR),
          maxMeshVR = _.max(meshVR),
          meshRampPos = {},
          overlapRampPos = {},
          testVal;
      for(var i = 1; i<that.settings.intersectionRampLength; i++){
        // allow primary neighbor to be included in center
        if(i === 2){
          centerMeshVR = _.clone(meshVR);
          centerOverlapVR = _.clone(overlapVR);
        };
        testVal = minOverlapVR - (i * overlapper.mesh.shapePointsLength);
        if(testVal > 0){
          overlapVR.push(testVal);
          overlapRampPos[testVal] = i;
        };
        testVal = maxOverlapVR + (i * overlapper.mesh.shapePointsLength);
        if(testVal < overlapper.mesh.geometry.vertices.length){
          overlapVR.push(testVal);
          overlapRampPos[testVal] = i;
        };
        testVal = minMeshVR - (i * mesh.shapePointsLength);
        if(testVal > 0){
          meshVR.push(testVal);
          meshRampPos[testVal] = i;
        };
        testVal = maxMeshVR + (i * mesh.shapePointsLength);
        if(testVal < mesh.geometry.vertices.length){
          meshVR.push(testVal);
          meshRampPos[testVal] = i;
        };
      };
      // Reset mesh translucency
      for(var i = 0; i<mesh.geometry.vertices.length; i++){
        mesh.material.attributes.translucent.value[i] = 1;
      };
      for(var i = 0; i<overlapper.mesh.geometry.vertices.length; i++){
        overlapper.mesh.material.attributes.translucent.value[i] = 1;
      };
      // build intersection
      var rampAlt = {}, rampDist = {};
      
      var getShapePoints = function(mesh, vertexRows, coreVertexRows, meshRampPos){
        var curV, cSerial, shapePoints = [], shapePointsSerial = [];
        for(var r = 0; r<vertexRows.length; r++){
          mesh.material.attributes.translucent.value[vertexRows[r]] = 0;
          mesh.material.attributes.translucent.value
            [vertexRows[r] + mesh.shapePointsLength -1] = 0;
          for(var i = 1; i<mesh.shapePointsLength -1; i++){
            curV = mesh.geometry.vertices[vertexRows[r] + i];
            cSerial = Math.round(curV.x) + ',' + Math.round(curV.y);
            if(shapePointsSerial.indexOf(cSerial) === -1){
              shapePoints.push(curV.clone());
              shapePointsSerial.push(cSerial);
            };
            mesh.material.attributes.translucent.value[vertexRows[r] + i] = 0;
            if(rampAlt[cSerial] === undefined || rampAlt[cSerial] < curV.z){
              rampAlt[cSerial] = curV.z;
            };
            if(coreVertexRows.indexOf(vertexRows[r]) === -1){
              rampDist[cSerial] = meshRampPos[vertexRows[r]];
            }else{
              rampDist[cSerial] = 0;
            };
          };
        };
        return shapePoints;
      };

      var shapePolygons =[
            snorb.util.pointsToPolygon(
              getShapePoints(mesh, meshVR, origMeshVR, meshRampPos), 
              terra.data.scale * 2),
            snorb.util.pointsToPolygon(
              getShapePoints(overlapper.mesh, overlapVR, origOverlapVR, overlapRampPos), 
              terra.data.scale * 2),
            snorb.util.pointsToPolygon(
              getShapePoints(mesh, centerMeshVR, origMeshVR, meshRampPos).concat(
                getShapePoints(overlapper.mesh, centerOverlapVR, origOverlapVR, overlapRampPos)), 
              terra.data.scale * 2)
            ];
      mesh.material.attributes.translucent.needsUpdate = true;
      overlapper.mesh.material.attributes.translucent.needsUpdate = true;
      for(var i = 0; i<shapePolygons.length; i++){
        if(!shapePolygons[i] || shapePolygons[i].length===0){
          return;
        };
      };
      var intersectionPoly = snorb.util.mergePolygons(shapePolygons);
      if(intersectionPoly.length === 0){
        return;
      };
      // Check polygon for other intersections
      var overlap = terra.repres.checkPolygon(intersectionPoly),
          refreshPoly = false;
      if(overlap.length){
        for(var i = 0; i<overlap.length; i++){
          if(overlap[i].data.type === 'path:intersection' &&
               overlap[i].underConstruction === undefined){
            // Remove and merge into this geometry
            rampDist = _.extend(rampDist, overlap[i].data.rampDist);
            rampAlt = _.extend(rampAlt, overlap[i].data.rampAlt);
            if(overlap[i].data.maxAlt > maxAlt){
              maxAlt = overlap[i].data.maxAlt;
            };
            shapePolygons.push(overlap[i].polygon);
            overlap[i].mesh.visible = false;
            overlappingIntersections.push(overlap[i]);
            refreshPoly = true;
          };
        };
        if(refreshPoly){
          intersectionPoly = snorb.util.mergePolygons(shapePolygons);
          if(intersectionPoly.length === 0){
            return;
          };
        };
      };

      var intersectionShape = new THREE.Shape(intersectionPoly);
      var intersectionGeometry = new THREE.ExtrudeGeometry(intersectionShape, {
            amount: that.settings.intersectionHeight,
            steps: 1,
            bevelEnabled: false,
            bevelThickness: 2,
            bevelSize: 1,
            bevelSegments: 1,
            material: 1,
            extrudeMaterial: 0
        });
      // adjust ramp alts
      var curV, cSerial;
      for(var i = 0; i<intersectionGeometry.vertices.length; i++){
          curV = intersectionGeometry.vertices[i];
          cSerial = Math.round(curV.x) + ',' + Math.round(curV.y);
          if(rampDist[cSerial]){ 
//             terra.debugBox(new THREE.Vector3(
//               curV.x, curV.y, 
//               rampAlt[cSerial] + that.settings.pathHeight));
            if(curV.z === 0){
              curV.z = rampAlt[cSerial] - maxAlt + that.settings.pathHeight;
            }else{
              curV.z += (rampDist[cSerial] / that.settings.intersectionRampLength
                            * (rampAlt[cSerial] - maxAlt)) + 
                        ((1- (rampDist[cSerial] / that.settings.intersectionRampLength)) 
                            * that.settings.pathHeight);
            };
          }else{
            if(rampAlt[cSerial] && curV.z === 0){
              curV.z = rampAlt[cSerial] - maxAlt + that.settings.pathHeight;
            };
//             terra.debugBox(new THREE.Vector3(
//               curV.x, curV.y, 
//               curV.z + maxAlt), 0xff00ff);
          };
      };

      var intersectionMaterials = [
            new THREE.MeshBasicMaterial({
              color: 0x0000ff,
              side: THREE.DoubleSide
            }),
            new THREE.MeshBasicMaterial({
              color: 0x000099,
              side: THREE.DoubleSide
            }),
          ],
          intersectionMesh = new THREE.Mesh(intersectionGeometry, 
                               new THREE.MeshFaceMaterial(intersectionMaterials));
      intersectionMesh.position.z = maxAlt;
      mesh.add(intersectionMesh);
      var representation = terra.repres.register(intersectionPoly);
      representation.mesh = intersectionMesh;
      representation.underConstruction = mesh;
      representation.pathMeshes = [mesh, overlapper.mesh]
                                    .concat(overlappingIntersections);
      representation.data.type = 'path:intersection';
      representation.data.rampDist = rampDist;
      representation.data.rampAlt = rampAlt;
      representation.data.maxAlt = maxAlt;
      representation.destroy = function(){
//         this.pathMeshes.forEach(function(pathMesh){
//           for(var i = 0; i<mesh.geometry.vertices.length; i++){
//             mesh.material.attributes.translucent.value[i] = 1;
//           };
//         });
        mesh.remove(this.mesh);
      };
      intersections.push(representation);
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


  this.refresh(true);
};
snorb.core.Path.prototype = new snorb.core.State();

