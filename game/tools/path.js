'use strict';
(function(){
  snorb.tools.path = function(scene, data){
    var that = this;

    this.label = 'Build Path';

    this.defaults = {
      horizHandleColor: 0xff0000,
      horizHandleGrabbedColor: 0x00ff00,
      horizHandleGap: 10,
      verticalHandleColor: 0xff00ff,
      verticalHandleGrabbedColor: 0xffff00,
      verticalHandleGap: 20,
    };
    this.data = _.defaults(data || {}, this.defaults);

    this.select = function(){
      scene.data.cursorRadius = scene.curTerra.data.scale;
      scene.data.cursorColor.copy(scene.defaults.cursorColor);
      scene.data.cursorVisible = true;
    };
    this.deselect = function(){
      if(that.underConstruction){
        that.underConstruction.parent.remove(that.underConstruction);
      };
      that.startPos = that.endPos = that.handleGrabbed = undefined;
      scene.data.cursorVisible = false;
    };

    this.underConstruction;
    this.handles = [];

    this.mousemove = function(pos, terra, event){
      that.lastPos = pos;
      if(that.underConstruction && !scene.mouseIsDown){
        var handleIntersect = scene.mouseIntersect(
          event.clientX, event.clientY, that.handles);
        if(handleIntersect.length){
          if(!that.handleGrabbed){
            for(var i=0; i<that.handles.length; i++){
              that.handles[i].material.color.copy(new THREE.Color(that.handles[i].staticColor));
            };
            that.handleGrabbed = handleIntersect[0].object;
            that.handleGrabbed.material.color.copy(new THREE.Color(that.handleGrabbed.grabbedColor));
          };
        }else{
          for(var i=0; i<that.handles.length; i++){
            that.handles[i].material.color.copy(new THREE.Color(that.handles[i].staticColor));
          };
          if(that.handleGrabbed){
            delete that.handleGrabbed;
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
          that.handleGrabbed.material.color.copy(new THREE.Color(that.handleGrabbed.grabbedColor));
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
    };

    this.mouseup = function(pos, terra, event){
      if(that.draggingNew){
        that.draggingNew = undefined;
        if(that.startPos === that.endPos){
          return;
        };
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
              }, terra),
            that.handleBox(new THREE.Vector3(that.midPos.x, 
                                             that.midPos.y, 
                                             that.midPos.z + that.data.verticalHandleGap), 
              function(event){
                var newPos = scene.mouse3D(
                  event.clientX, event.clientY, 'x', this.position.x);
                this.position.z = newPos.y;
                that.midPos.z = newPos.y - that.data.verticalHandleGap;
                that.handles[0].position.copy(this.position);
                that.handles[0].position.z -= that.data.verticalHandleGap - 
                                              that.data.horizHandleGap;
              }, terra, true),
            that.handleBox(new THREE.Vector3(that.startPos.x, 
                                             that.startPos.y, 
                                             that.startPos.z + that.data.verticalHandleGap), 
              function(event){
                var newPos = scene.mouse3D(
                  event.clientX, event.clientY, 'x', this.position.x);
                this.position.z = newPos.y;
                that.startPos.z = newPos.y - that.data.verticalHandleGap;
              }, terra, true),
            that.handleBox(new THREE.Vector3(that.endPos.x, 
                                             that.endPos.y, 
                                             that.endPos.z + that.data.verticalHandleGap), 
              function(event){
                var newPos = scene.mouse3D(
                  event.clientX, event.clientY, 'x', this.position.x);
                this.position.z = newPos.y;
                that.endPos.z = newPos.y - that.data.verticalHandleGap;
              }, terra, true)
          ];
        for(var i = 0; i<that.handles.length; i++){
          terra.object.add(that.handles[i]);
          that.handles[i].index = i;
        };
      }else if(that.handleGrabbed){
        that.handleGrabbed = undefined;
        that.buildPreview(terra);
        var coveredVertices = terra.coveredVertices(that.underConstruction);
        for(var i = 0; i<coveredVertices.length; i++){
          terra.object.material.attributes.foliage.value[coveredVertices[i]] = 1000;
        };
        terra.object.material.attributes.foliage.needsUpdate = true;
      };
    };

    this.handleBox = function(pos, mouseHandler, terra, isVertical){
      var color = isVertical ? that.data.horizHandleColor : that.data.verticalHandleColor;
      var scale = terra.data.scale;
      var mesh = new THREE.Mesh(
        new THREE.BoxGeometry(scale, scale, scale),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 1
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
        midPos = that.midPos.clone();
      };
      var curGrabbed;
      if(that.underConstruction){
        terra.object.remove(that.underConstruction);
        that.underConstruction = undefined;
      };
      var length = Math.sqrt(Math.pow(midPos.x - startPos.x, 2) +
                             Math.pow(midPos.y - startPos.y, 2)) +
                   Math.sqrt(Math.pow(endPos.x - midPos.x, 2) +
                             Math.pow(endPos.y - midPos.y, 2));
      if(length < terra.data.scale){
        return;
      };
      var spline = new THREE.SplineCurve3([startPos, midPos, endPos]);
      var shape = new THREE.Shape([
        new THREE.Vector2(0, -5),
        new THREE.Vector2(5, -5),
        new THREE.Vector2(5, 5),
        new THREE.Vector2(0, 5)
      ]);
      var geometry = new THREE.ExtrudeGeometry(shape, {
        steps: Math.round(length/terra.data.scale),
        bevelEnabled: false,
        extrudePath: spline
      });
      var mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
          color: 0x0000ff
      }));
      mesh.position.z += 5;
      terra.object.add(mesh);
      that.underConstruction = mesh;
    };

  };
  snorb.tools.path.prototype = new snorb.core.Tool();

})();
