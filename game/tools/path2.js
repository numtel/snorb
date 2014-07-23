'use strict';
(function(){
  snorb.tools.path2 = function(scene, data){
    var that = this;

    this.label = 'Build Path2';

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
      verticalHandleGap: 30
    };

    this.fieldDefinitions = {
      pathWidth: {label: 'Width', type: 'int', min: 1, max: 100},
      construct: {label: 'Construct', type: 'button', click: function(){
        this.finalize();
      }}
    };

    this.optionChange = function(optionName){
      if(optionName === 'pathWidth' && that.path){
        that.path.update({width: that.data.pathWidth});
        scene.data.cursorRadius = that.data.pathWidth/2;
      };
    };

    this.select = function(){
      scene.data.cursorRadius = that.data.pathWidth/2;
      scene.data.cursorColor.copy(scene.defaults.cursorColor);
      scene.data.cursorVisible = true;
    };
    this.deselect = function(){
      if(that.path){
        that.path.remove();
        that.path = undefined;
        that.updateHandles();
      };
      that.handleGrabbed = undefined;
      scene.data.cursorVisible = false;
    };

    this.path = undefined;
    this.setConstruction = function(terra, data){
      if(data.width === undefined){
        data.width = that.data.pathWidth;
      };
      if(that.path === undefined){
        that.path = new snorb.core.Path(terra, data);
      }else{
        that.path.reset(data);
      };
    };

    this.handleGrabbed = undefined;
    this.draggingNew = false;
    this.handles = [];

    this.updateHandles = function(){
      // Private function
      var handleBox = function(pos, mouseHandler, terra, isVertical){
        var color = isVertical ? 
              that.settings.horizHandleColor : that.settings.verticalHandleColor;
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
          var centerGeo = new THREE.SphereGeometry(scale * 0.7, 8, 8);
          THREE.GeometryUtils.merge(geometry, centerGeo);
        };
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();
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

      // Begin procedure
      if(!that.path || that.handles.length){
        // Remove current handles
        for(var i = 0; i<that.handles.length; i++){
          if(that.handles[i].parent){
            that.handles[i].parent.remove(that.handles[i]);
          };
        };
        that.handles = [];
        if(!that.path){
          return;
        };
      };

      var terra = that.path.terra,
          handleKeys = ['mid', 'start', 'end'];
      for(var i = 0; i<handleKeys.length; i++){
        if(!that.path.data[handleKeys[i]]){
          return;
        };
      };

      _.each(handleKeys, function(thisKey){
        var handleXY = handleBox(new THREE.Vector3(
          that.path.data[thisKey].x, 
          that.path.data[thisKey].y, 
          that.path.data[thisKey].z + that.settings.horizHandleGap), 
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
            that.path.data[thisKey].copy(this.position);
            that.path.data[thisKey].z -= that.settings.horizHandleGap;
            that.path.refresh(true);
            handleZ.position.copy(this.position);
            handleZ.position.z += that.settings.verticalHandleGap -
                                          that.settings.horizHandleGap;
          }, terra);
        var handleZ = handleBox(new THREE.Vector3(
          that.path.data[thisKey].x, 
          that.path.data[thisKey].y, 
          that.path.data[thisKey].z + that.settings.verticalHandleGap), 
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
            that.path.data[thisKey].z = newAlt;
            that.path.refresh(false);
            handleXY.position.z = newAlt + that.settings.horizHandleGap;
          }, terra, true);

        that.handles.push(handleXY);
        that.handles.push(handleZ);
        terra.object.add(handleXY);
        terra.object.add(handleZ);
      });
    };

    this.mousemove = function(pos, terra, event){
      that.lastPos = pos;
      if(that.path && !scene.mouseIsDown){
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
      }else if(scene.mouseIsDown && that.draggingNew && pos){
        var param = {end: pos.clone()};
        param.end.z = that.altitudeWithWater(param.end, terra);
        that.path.update(param);
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
        var param = {start: that.lastPos.clone()};
        param.start.z = that.altitudeWithWater(param.start, terra);
        that.setConstruction(terra, param);
        that.draggingNew = true;
      };
    };

    this.rebuild = function(terra, data){
      var cPath = new snorb.core.Path(terra, data);
      cPath.construct();
    };

    this.mouseup = function(pos, terra, event){
      if(that.draggingNew){
        that.draggingNew = undefined;
        that.calculateMid();
        that.updateHandles();
      }else if(that.handleGrabbed){
        that.handleGrabbed = undefined;
      };
    };

    this.calculateMid = function(){
      if(!that.path.data.start || !that.path.data.end){
        return;
      }
      var param = {mid: new THREE.Vector3(
        that.path.data.start.x + ((that.path.data.end.x - that.path.data.start.x)/2),
        that.path.data.start.y + ((that.path.data.end.y - that.path.data.start.y)/2),
        0
      )};
      param.mid.z = that.altitudeWithWater(param.mid, that.path.terra);
      that.path.update(param);
    };

    this.finalize = function(){
      if(that.path){
        that.path.construct();
        that.path = undefined;
        that.updateHandles();
      };
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

  };
  snorb.tools.path2.prototype = new snorb.core.Tool();

})();
