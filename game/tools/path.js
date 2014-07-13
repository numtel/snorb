'use strict';
(function(){
  snorb.tools.path = function(scene, data){
    var that = this;

    this.label = 'Build Path';

    this.defaults = {
      pathWidth: 10
    };
    this.data = _.defaults(data || {}, this.defaults);

    this.settings = {
      pathErrorHighlight: new THREE.Vector3(1,0,0),
      horizHandleColor: 0x00ff00,
      horizHandleGrabbedColor: 0xff0000,
      horizHandleGap: 10,
      verticalHandleColor: 0xffff00,
      verticalHandleGrabbedColor: 0xff0000,
      verticalHandleGap: 30,
      maxAltitudeDisplacement: 50,
      pathHeight: 5,
      bridgeHeight: 5,
      pylonDistance: 50,
      bridgeSideColor: 0xff0000,
      bridgePylonColor: 0x990000,
      bridgeHeightOverWater: 20,
      intersectionHeight: 2,
      intersectionRampLength: 3, // minimum: 2, units: vertex rows
      intersectionMaxRampHeight: 15
    };

    this.fieldDefinitions = {
      pathWidth: {label: 'Width', type: 'int', min: that.settings.pathHeight + 1, max: 100},
      construct: {label: 'Construct', type: 'button', click: function(){
        this.finalize();
      }}
    };

    this.optionChange = function(optionName){
      if(optionName === 'pathWidth' && that.underConstruction){
        that.buildPreview(that.underConstruction.parent.terra);
      };
    };

    this.select = function(){
      scene.data.cursorRadius = scene.curTerra.data.scale;
      scene.data.cursorColor.copy(scene.defaults.cursorColor);
      scene.data.cursorVisible = true;
    };
    this.deselect = function(){
      if(that.underConstruction){
        var terra = that.underConstruction.parent.terra;
        that.underConstruction.parent.remove(that.underConstruction);
        that.underConstruction = undefined;
        for(var i=0; i<that.handles.length; i++){
          terra.object.remove(that.handles[i]);
        };
        that.handles = [];
        that.updateTerraAttributes(terra);
      };
      that.startPos = that.endPos = that.handleGrabbed = undefined;
      scene.data.cursorVisible = false;
    };

    this.underConstruction;
    this.handleGrabbed;
    this.draggingNew = false;
    this.handles = [];

    this.mousemove = function(pos, terra, event){
      that.lastPos = pos;
      if(that.underConstruction && !scene.mouseIsDown){
        var handleIntersect = scene.mouseIntersect(
          event.clientX, event.clientY, that.handles);
        if(handleIntersect.length){
          if(!that.handleGrabbed){
            for(var i=0; i<that.handles.length; i++){
              that.handles[i].material.color.copy(
                new THREE.Color(that.handles[i].staticColor));
            };
            that.handleGrabbed = handleIntersect[0].object;
            that.handleGrabbed.material.color.copy(
              new THREE.Color(that.handleGrabbed.grabbedColor));
          };
        }else{
          for(var i=0; i<that.handles.length; i++){
            that.handles[i].material.color.copy(new THREE.Color(that.handles[i].staticColor));
          };
          if(that.handleGrabbed){
            that.handleGrabbed = undefined;
          };
        };
      };
      if(that.handleGrabbed && scene.mouseIsDown){
        that.handleGrabbed.mouseHandler.call(that.handleGrabbed, event);
        that.buildPreview(terra);
      }else if(scene.mouseIsDown && that.draggingNew && that.startPos && pos){
        that.endPos = pos.clone();
        that.endPos.z = that.altitudeWithWater(that.endPos, terra);
        that.buildPreview(terra);
      };
    };

    this.mousedown = function(pos, terra, event){
      if(that.underConstruction){
        var handleIntersect = scene.mouseIntersect(
          event.clientX, event.clientY, that.handles);
        if(handleIntersect.length){
          that.handleGrabbed = handleIntersect[0].object;
          that.handleGrabbed.material.color.copy(
            new THREE.Color(that.handleGrabbed.grabbedColor));
        };
      };
      if(that.handleGrabbed === undefined && that.lastPos){
        for(var i=0; i<that.handles.length; i++){
          terra.object.remove(that.handles[i]);
        };
        if(that.underConstruction){
          terra.object.remove(that.underConstruction);
        };
        that.startPos = that.endPos = that.midPos = that.lastPos.clone();
        that.startPos.z = that.altitudeWithWater(that.startPos, terra);
        that.draggingNew = true;
      };
    };

    this.rebuild = function(terra, data){
      var origWidth = that.data.pathWidth;
      if(data.width){
        that.data.pathWidth = data.width;
      };
      _.each(['startPos','midPos','endPos'], function(whichPos){
        that[whichPos] = data[whichPos];
      });
      that.buildPreview(terra);
      that.finalize();
      that.data.pathWidth = origWidth;
    };

    this.mouseup = function(pos, terra, event){
      if(that.draggingNew){
        that.draggingNew = undefined;
        if(that.startPos === that.endPos){
          that.underConstruction = undefined;
          that.updateTerraAttributes(terra);
          return;
        };

        that.handles = [];
        _.each(['midPos', 'startPos', 'endPos'], function(posKey){
          var thisKey = posKey;
          var handleXY = that.handleBox(new THREE.Vector3(that[thisKey].x, 
                                             that[thisKey].y, 
                                             that[thisKey].z + that.settings.horizHandleGap), 
              function(event){
                var newPos = scene.mouse3D(
                  event.clientX, event.clientY, 'y', this.position.z);
                if(newPos.x > terra.data.size.x * terra.data.scale / 2){
                  newPos.x = terra.data.size.x * terra.data.scale / 2;
                };
                if(newPos.x < -terra.data.size.x * terra.data.scale / 2){
                  newPos.x = -terra.data.size.x * terra.data.scale / 2;
                };
                if(newPos.z > terra.data.size.y * terra.data.scale / 2){
                  newPos.z = terra.data.size.y * terra.data.scale / 2;
                };
                if(newPos.z < -terra.data.size.y * terra.data.scale / 2){
                  newPos.z = -terra.data.size.y * terra.data.scale / 2;
                };
                this.position.x = newPos.x;
                this.position.y = -newPos.z;
                that[thisKey].copy(this.position);
                that[thisKey].z -= that.settings.horizHandleGap;
                handleZ.position.copy(this.position);
                handleZ.position.z += that.settings.verticalHandleGap -
                                              that.settings.horizHandleGap;
              }, terra);
          var handleZ = that.handleBox(new THREE.Vector3(
            that[thisKey].x, 
            that[thisKey].y, 
            that[thisKey].z + that.settings.verticalHandleGap), 
            function(event){
              var newPos = scene.mouse3D(
                event.clientX, event.clientY, 'x', this.position.x),
                newAlt = newPos.y - that.settings.verticalHandleGap;
              if(newAlt < terra.data.minAlt){
                newPos.y = terra.data.minAlt + that.settings.verticalHandleGap;
                newAlt = terra.data.minAlt;
              };
              if(newAlt > terra.data.maxAlt){
                newPos.y = terra.data.maxAlt + that.settings.verticalHandleGap;
                newAlt = terra.data.maxAlt;
              };
              this.position.z = newPos.y;
              that[thisKey].z = newAlt;
              handleXY.position.z = newAlt + that.settings.horizHandleGap;
            }, terra, true);
          that.handles.push(handleXY);
          that.handles.push(handleZ);
        });
        for(var i = 0; i<that.handles.length; i++){
          terra.object.add(that.handles[i]);
          that.handles[i].index = i;
        };
      }else if(that.handleGrabbed){
        that.handleGrabbed = undefined;
        that.buildPreview(terra);
      };
    };

    this.generatePolygon = function(){
      if(that.underConstruction){
        var terra = that.underConstruction.parent.terra;
        var vPer = that.underConstruction.shapePointsLength;
        var pointArray = [], curV, 
            serialized = [], cSer;
        for(var i = 0; i<that.underConstruction.geometry.vertices.length; i++){
          curV = that.underConstruction.geometry.vertices[i];
          cSer = curV.x + ',' + curV.y;
          if(serialized.indexOf(cSer) === -1){
            pointArray.push(new THREE.Vector2(curV.x, curV.y));
            serialized.push(cSer);
          };
        };
        return snorb.util.pointsToPolygon(pointArray, terra.data.scale * 2);
      };
    };

    this.finalize = function(){
      if(that.underConstruction){
        var terra = that.underConstruction.parent.terra;
        if(that.polygon.length === 0){
          return;
        };
        for(var i = 0; i<that.handles.length; i++){
          terra.object.remove(that.handles[i]);
        };
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

        var mesh = that.underConstruction;
        that.buildTunnels(mesh, terra);
        that.buildBridges(mesh, terra);

        var representation = terra.repres.register(that.polygon);
        representation.mesh = mesh;
        representation.data.type = 'path';
        representation.data.rebuildTool = 'path';
        representation.data.startPos = that.startPos;
        representation.data.midPos = that.midPos;
        representation.data.endPos = that.endPos;
        representation.data.width = that.data.pathWidth;
        representation.destroy = function(){
          terra.object.remove(this.mesh);
        };
        representation.highlight = function(color){
          if(color === undefined){
            color = new THREE.Vector3(0,0,0);
          };
          mesh.material.uniforms.highlight.value.copy(color);
        };

        that.underConstruction = undefined;
      };
    };

    this.handleBox = function(pos, mouseHandler, terra, isVertical){
      var color = isVertical ? that.settings.horizHandleColor : that.settings.verticalHandleColor;
      var scale = terra.data.scale;
      var geometry;
      if(isVertical){
        // vertical cone geometry
        geometry = new THREE.CylinderGeometry(0, scale * 0.5, scale * 1, 8, 1, false);
        for(var i = 0; i <geometry.vertices.length; i++){
          geometry.vertices[i].copy(new THREE.Vector3(
            geometry.vertices[i].x,
            geometry.vertices[i].z,
            geometry.vertices[i].y
          ));
        };
        geometry.computeFaceNormals();
      }else{
        // 4-way horizontal cones
        geometry = new THREE.CylinderGeometry(0, scale * 0.5, scale * 1, 8, 1, false);
        for(var i = 0; i<geometry.vertices.length; i++){
          geometry.vertices[i].y+=scale;
        };
        var cloneGeo = geometry.clone();
        for(var i = 0; i<cloneGeo.vertices.length; i++){
          cloneGeo.vertices[i].y*=-1;
        };
        THREE.GeometryUtils.merge(geometry, cloneGeo);
        cloneGeo = geometry.clone();
        for(var i = 0; i<cloneGeo.vertices.length; i++){
          cloneGeo.vertices[i].x = geometry.vertices[i].y;
          cloneGeo.vertices[i].y = geometry.vertices[i].x;
        };
        THREE.GeometryUtils.merge(geometry, cloneGeo);
        geometry.computeFaceNormals();
        
      };
      var mesh = new THREE.Mesh(geometry,
        new THREE.MeshLambertMaterial({
          color: new THREE.Color(color),
          side: THREE.DoubleSide
        })
      );
      mesh.isVertical = isVertical;
      mesh.staticColor = color;
      mesh.grabbedColor = isVertical ? that.settings.horizHandleGrabbedColor :
                                       that.settings.verticalHandleGrabbedColor;
      mesh.mouseHandler = mouseHandler;
      mesh.position.copy(pos);
      return mesh;
    };

    this.altitudeWithWater = function(pos, terra){
      var coord = terra.coord(pos),
          alt = coord.altitude;
      for(var i = 0; i<coord.objects.length; i++){
        if(coord.objects[i].data.type === 'water'){
          alt = coord.objects[i].data.altitude 
                + that.settings.bridgeHeightOverWater;
        };
      };
      return alt;
    };

    this.buildPreview = function(terra){
      var startPos = that.startPos,
          endPos = that.endPos,
          midPos;
      if(that.draggingNew){
        midPos = new THREE.Vector3(
          startPos.x + ((endPos.x - startPos.x)/2),
          startPos.y + ((endPos.y - startPos.y)/2),
          0
        );
        midPos.z = that.altitudeWithWater(midPos, terra);
        that.midPos = midPos;
      }else{
        midPos = new THREE.Vector3().copy(that.midPos);
      };
      var curGrabbed, material;
      if(that.underConstruction){
        material = that.underConstruction.material;
        terra.object.remove(that.underConstruction);
        that.underConstruction = undefined;
      };
      var length = Math.sqrt(Math.pow(midPos.x - startPos.x, 2) +
                             Math.pow(midPos.y - startPos.y, 2)) +
                   Math.sqrt(Math.pow(endPos.x - midPos.x, 2) +
                             Math.pow(endPos.y - midPos.y, 2));
      if(length < terra.data.scale){
        that.updateTerraAttributes(terra);
        return;
      };
      var spline = new THREE.SplineCurve3([startPos, midPos, endPos]);
      var pathShapePoints = function(flipCoord){
        var points = [];
        if(flipCoord){
          points.push(new THREE.Vector2(0, -that.data.pathWidth / 2));
        }else{
          points.push(new THREE.Vector2(-that.data.pathWidth / 2, 0));
        };
        var xVal = (-that.data.pathWidth/2) - terra.data.scale;
        while(xVal !== that.data.pathWidth /2){
          xVal += terra.data.scale;
          if(xVal > that.data.pathWidth /2){
            xVal = that.data.pathWidth /2;
          };
          if(flipCoord){
            points.push(new THREE.Vector2(that.settings.pathHeight, xVal));
          }else{
            points.push(new THREE.Vector2(xVal, that.settings.pathHeight));
          };
        };
        if(flipCoord){
          points.push(new THREE.Vector2(0, that.data.pathWidth / 2));
        }else{
          points.push(new THREE.Vector2(that.data.pathWidth / 2, 0));
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
      if(material === undefined){
        material = new THREE.ShaderMaterial({
          uniforms: {
            texture: {type: 't', value: THREE.ImageUtils.loadTexture(
                      snorb.textureDir + 'path/road.png')},
            highlight: {type: 'v3', value: new THREE.Vector3(0.0, 0.0, 0.0)}
          },
          vertexShader: snorb.util.shader('pathVertex'),
          fragmentShader: snorb.util.shader('pathFragment')
        });
      };
      var mesh = new THREE.Mesh(geometry, material);
      //mesh.position.z += 5;
      terra.object.add(mesh);
      mesh.shapePointsLength = shape.actions.length;
      that.underConstruction = mesh;
      that.updateTerraAttributes(terra);
      that.polygon = that.generatePolygon();
      var overlap = terra.repres.checkPolygon(that.polygon);
      if(overlap.length){
        for(var i = 0; i<overlap.length; i++){
          if(overlap[i].data.type === 'path'){
            that.buildIntersection(mesh, that.polygon, overlap[i], terra);
          };
        };
//         mesh.material.uniforms.highlight.value.copy(that.settings.pathErrorHighlight);
      }else{
//         mesh.material.uniforms.highlight.value.copy(new THREE.Vector3(0,0,0));
      };
    };

    this.buildIntersection = function(mesh, meshPolygon, overlapper, terra){
      // TODO: intersections overlapping eachother need to be merged!
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
      var overlapV = overlappingVertices(mesh, meshPolygon, overlapper),
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
      // build intersection
      var rampAlt = {}, rampDist = {};
      var getShapePoints = function(mesh, vertexRows, coreVertexRows, meshRampPos){
        var curV, cSerial, shapePoints = [], shapePointsSerial = [];
        for(var r = 0; r<vertexRows.length; r++){
          for(var i = 1; i<mesh.shapePointsLength -1; i++){
            curV = mesh.geometry.vertices[vertexRows[r] + i];
            cSerial = Math.round(curV.x) + ',' + Math.round(curV.y);
            if(shapePointsSerial.indexOf(cSerial) === -1){
              shapePoints.push(curV.clone());
              shapePointsSerial.push(cSerial);
            };
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
      for(var i = 0; i<shapePolygons.length; i++){
        if(shapePolygons[i].length===0){
          return;
        };
      };
      var intersectionPoly = snorb.util.mergePolygons(shapePolygons);
      if(intersectionPoly.length === 0){
        return;
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
    };

    this.updateTerraAttributes = function(terra){
      for(var i = 0; i<terra.object.geometry.vertices.length; i++){
        terra.object.material.attributes.displacement.value[i] = 0;
        terra.object.material.attributes.translucent.value[i] = 1;
      };
      if(that.underConstruction){
        var coveredVertices = terra.coveredVertices(that.underConstruction),
            curV, curCoord, attrVal;
        for(var i = 0; i<coveredVertices.meshCoords.length; i++){
          curV = that.underConstruction.geometry.vertices[i];
          curCoord = coveredVertices.meshCoords[i];
          if(curV.z < curCoord.altitude){
            // Do some landscaping...
            _.each(['nw','ne','sw','se'], function(ord){
              if(curCoord[ord]){
                attrVal = terra.object.geometry.vertices[curCoord[ord]].z - curV.z;
                if(terra.object.material.attributes.displacement.value[curCoord[ord]] < attrVal){
                  terra.object.material.attributes.displacement.value[curCoord[ord]] = attrVal;
                };
                if(curV.z < curCoord.altitude - that.settings.maxAltitudeDisplacement){
                  terra.object.material.attributes.translucent.value[curCoord[ord]] = 0.3;
                };
              };
            });
          };
        };
      };
      terra.object.material.attributes.displacement.needsUpdate = true;
      terra.object.material.attributes.translucent.needsUpdate = true;
    };

    this.buildBridges = function(parentMesh, terra){
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
        var mesh = new THREE.Mesh(geometry, material);
        return mesh;
      };
      var vertices = parentMesh.geometry.vertices,
          cCoord,
          vPer = parentMesh.shapePointsLength,
          pylonDiv = that.settings.pylonDistance / terra.data.scale * vPer;
      for(var i = vPer; i<vertices.length-vPer; i+=vPer){
        cCoord = terra.coord(vertices[i]);
        if(vertices[i].z > cCoord.altitude){
            parentMesh.add(boxMesh([vertices[i-vPer], vertices[i-1],
                                    vertices[i+vPer - 1], vertices[i]],
                                    i % pylonDiv < 2));
        };
      };
    };

    this.buildTunnels = function(parentMesh, terra){
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
        var mesh = new THREE.Mesh(geometry, material);
        return mesh;
      };
      var vertices = parentMesh.geometry.vertices,
          cCoord,
          vPer = parentMesh.shapePointsLength,
          lastWasTunnel = false;
      for(var i = vPer; i<vertices.length-vPer; i+=vPer){
        cCoord = terra.coord(vertices[i]);
        if(vertices[i].z < cCoord.altitude){
          if(lastWasTunnel === false){
            parentMesh.add(boxMesh([vertices[i-vPer], vertices[i-1],
                                    vertices[i+vPer - 1], vertices[i]]));
          };
          lastWasTunnel = true;
        }else if(lastWasTunnel === true){
          parentMesh.add(boxMesh([vertices[i-vPer], vertices[i-1],
                                  vertices[i+vPer - 1], vertices[i]]));
          lastWasTunnel = false;
        };
      };
    };

  };
  snorb.tools.path.prototype = new snorb.core.Tool();

})();
