'use strict';
(function(){
  snorb.tools.path = function(scene, data){
    var that = this;

    this.label = 'Build Path';

    this.defaults = {
      pathErrorHighlight: new THREE.Vector3(1,0,0),
      horizHandleColor: 0x00ff00,
      horizHandleGrabbedColor: 0xff0000,
      horizHandleGap: 10,
      verticalHandleColor: 0xffff00,
      verticalHandleGrabbedColor: 0xff0000,
      verticalHandleGap: 30,
      maxAltitudeDisplacement: 50,
      pathHeight: 5,
      pathWidth: 10,
      bridgeHeight: 5
    };
    this.data = _.defaults(data || {}, this.defaults);

    this.fieldDefinitions = {
      construct: {label: 'Construct', type: 'button', click: function(){
        this.finalize();
      }}
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
        that.buildPreview(terra);
      };
    };

    this.mousedown = function(pos, terra, event){
      if(that.underConstruction){
        var handleIntersect = scene.mouseIntersect(
          event.clientX, event.clientY, that.underConstruction.children);
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
        that.draggingNew = true;
      };
    };

    this.rebuild = function(terra, data){
      _.each(['startPos','midPos','endPos'], function(whichPos){
        that[whichPos] = data[whichPos];
      });
      that.buildPreview(terra);
      that.finalize();
    };

    this.mouseup = function(pos, terra, event){
      if(that.draggingNew){
        that.draggingNew = undefined;
        if(that.startPos === that.endPos){
          that.underConstruction = undefined;
          that.updateTerraAttributes(terra);
          return;
        };
        // Push middle xy mover
        that.handles = [
            that.handleBox(new THREE.Vector3(that.midPos.x, 
                                             that.midPos.y, 
                                             that.midPos.z + that.data.horizHandleGap), 
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
                that.midPos.copy(this.position);
                that.midPos.z -= that.data.horizHandleGap;
                that.handles[1].position.copy(this.position);
                that.handles[1].position.z += that.data.verticalHandleGap -
                                              that.data.horizHandleGap;
              }, terra)
          ];
        // Push each z mover
        _.each(['midPos', 'startPos', 'endPos'], function(posKey){
          var thisKey = posKey;
          that.handles.push(that.handleBox(new THREE.Vector3(
            that[thisKey].x, 
            that[thisKey].y, 
            that[thisKey].z + that.data.verticalHandleGap), 
            function(event){
              var newPos = scene.mouse3D(
                event.clientX, event.clientY, 'x', this.position.x),
                newAlt = newPos.y - that.data.verticalHandleGap;
              if(newAlt < terra.data.minAlt){
                newPos.y = terra.data.minAlt + that.data.verticalHandleGap;
                newAlt = terra.data.minAlt;
              };
              if(newAlt > terra.data.maxAlt){
                newPos.y = terra.data.maxAlt + that.data.verticalHandleGap;
                newAlt = terra.data.maxAlt;
              };
              this.position.z = newPos.y;
              that[thisKey].z = newAlt;
              if(thisKey === 'midPos'){
                that.handles[0].position.z = newAlt + that.data.horizHandleGap;
              };
            }, terra, true)
          );
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
        var pointArray = [], curV;
        for(var i = 0; i<that.underConstruction.geometry.vertices.length; i+=4){
          curV = that.underConstruction.geometry.vertices[i];
          pointArray.push(new THREE.Vector2(curV.x, curV.y));
          curV = that.underConstruction.geometry.vertices[i+3];
          pointArray.push(new THREE.Vector2(curV.x, curV.y));
        };
        return snorb.util.pointsToPolygon(pointArray, terra.data.scale * 2);
      };
    };

    this.finalize = function(){
      if(that.underConstruction){
        var terra = that.underConstruction.parent.terra;
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
      var color = isVertical ? that.data.horizHandleColor : that.data.verticalHandleColor;
      var scale = terra.data.scale;
      var geometry;
      if(isVertical){
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
      mesh.grabbedColor = isVertical ? that.data.horizHandleGrabbedColor :
                                       that.data.verticalHandleGrabbedColor;
      mesh.mouseHandler = mouseHandler;
      mesh.position.copy(pos);
      return mesh;
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
        var coord = terra.coord(midPos);
        midPos.z = coord.altitude;
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
      var shape = new THREE.Shape([
        new THREE.Vector2(-that.data.pathWidth / 2, 0),
        new THREE.Vector2(-that.data.pathWidth / 2, that.data.pathHeight),
        new THREE.Vector2(that.data.pathWidth / 2, that.data.pathHeight),
        new THREE.Vector2(that.data.pathWidth / 2, 0)
      ]);
      var geometry = new THREE.ExtrudeGeometry(shape, {
        steps: Math.round(length/terra.data.scale),
        bevelEnabled: false,
        extrudePath: spline
      });
      // TODO: Generalize the following temporary fix for paths that are
      //       extruded in a rotation
      if(Math.abs(Math.round(geometry.vertices[2].z - geometry.vertices[1].z)) 
          > that.data.pathHeight){
        shape = new THREE.Shape([
          new THREE.Vector2(0, -that.data.pathWidth / 2, 0),
          new THREE.Vector2(that.data.pathHeight, -that.data.pathWidth / 2),
          new THREE.Vector2(that.data.pathHeight, that.data.pathWidth / 2),
          new THREE.Vector2(0, that.data.pathWidth / 2)
        ]);
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
      that.underConstruction = mesh;
      that.updateTerraAttributes(terra);
      that.polygon = that.generatePolygon();
      var overlap = terra.repres.checkPolygon(that.polygon);
      if(overlap.length){
        mesh.material.uniforms.highlight.value.copy(that.data.pathErrorHighlight);
      }else{
        mesh.material.uniforms.highlight.value.copy(new THREE.Vector3(0,0,0));
      };
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
              };
            });
            if(curV.z < curCoord.altitude - that.data.maxAltitudeDisplacement){
              // Go underground!
              _.each(['nw','ne','sw','se'], function(ord){
                if(curCoord[ord]){
                  terra.object.material.attributes.translucent.value[curCoord[ord]] = 0.3;
                };
              });
            };
          };
        };
      };
      terra.object.material.attributes.displacement.needsUpdate = true;
      terra.object.material.attributes.translucent.needsUpdate = true;
    };

    this.buildBridges = function(parentMesh, terra){
      var boxMesh = function(vertices){
        var geometry = new THREE.Geometry(),
            curV;
        for(var i = 0; i<vertices.length; i++){
          curV = vertices[i].clone();
          curV.z -= that.data.pathHeight + that.data.bridgeHeight;
          geometry.vertices.push(curV);
        };
        for(var i = 0; i<vertices.length; i++){
          curV = vertices[i].clone();
          curV.z -= that.data.pathHeight;
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
          lastWasBridge = false;
      for(var i = 4; i<vertices.length-4; i+=4){
        cCoord = terra.coord(vertices[i]);
        if(vertices[i].z > cCoord.altitude){
            parentMesh.add(boxMesh([vertices[i-4], vertices[i-1],
                                    vertices[i+3], vertices[i]]));
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
          lastWasTunnel = false;
      for(var i = 4; i<vertices.length-4; i+=4){
        cCoord = terra.coord(vertices[i]);
        if(vertices[i].z < cCoord.altitude){
          if(lastWasTunnel === false){
            parentMesh.add(boxMesh([vertices[i-4], vertices[i-1],
                                    vertices[i+3], vertices[i]]));
          };
          lastWasTunnel = true;
        }else if(lastWasTunnel === true){
          parentMesh.add(boxMesh([vertices[i-4], vertices[i-1],
                                  vertices[i+3], vertices[i]]));
          lastWasTunnel = false;
        };
      };
    };

  };
  snorb.tools.path.prototype = new snorb.core.Tool();

})();
