'use strict';
(function(){
  snorb.tools.path = function(scene, data){
    var that = this;

    this.label = 'Build Path';

    this.defaults = {
      handleColor: 0xff0000,
      handleGrabbedColor: 0x00ff00
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

    this.mousemove = function(pos, terra, event){
      that.lastPos = pos;
      if(that.underConstruction && !scene.mouseIsDown){
        var handleIntersect = scene.mouseIntersect(
          event.clientX, event.clientY, that.underConstruction.children);
        if(handleIntersect.length){
          that.handleGrabbed = handleIntersect[0].object;
          that.handleGrabbed.material.color.copy(new THREE.Color(that.data.handleGrabbedColor));
        }else{
          if(that.handleGrabbed){
            that.handleGrabbed.material.color.copy(new THREE.Color(that.data.handleColor));
            delete that.handleGrabed;
          };
        };
      };
      if(that.handleGrabbed && scene.mouseIsDown){
        var newPos = scene.mouse3D(
          event.clientX, event.clientY, 'y', that.handleGrabbed.position.z);
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
        that.handleGrabbed.position.x = newPos.x;
        that.handleGrabbed.position.y = -newPos.z;
        that.buildPreview(terra, that.startPos, that.endPos, 
                          that.handleGrabbed.position.clone(), 0);
      }else if(scene.mouseIsDown && that.startPos && pos){
        that.endPos = pos.clone();
        that.buildPreview(terra, that.startPos, that.endPos);
      };
    };

    this.mousedown = function(pos, terra, event){
      if(that.underConstruction){
        var handleIntersect = scene.mouseIntersect(
          event.clientX, event.clientY, that.underConstruction.children);
        if(handleIntersect.length){
          that.handleGrabbed = handleIntersect[0].object;
          that.handleGrabbed.material.color.copy(new THREE.Color(that.data.handleGrabbedColor));
        };
      };
      if(that.handleGrabbed === undefined && that.lastPos){
        that.startPos = that.lastPos.clone();
      };
    };

    this.rebuild = function(terra, data){
    };

    this.mouseup = function(pos, terra, event){
      if(that.handleGrabbed){
        var midPos = that.handleGrabbed.position.clone();
        delete that.handleGrabbed;
        that.buildPreview(terra, that.startPos, that.endPos, midPos);
        var coveredVertices = terra.coveredVertices(that.underConstruction);
        for(var i = 0; i<coveredVertices.length; i++){
          terra.object.material.attributes.foliage.value[coveredVertices[i]] = 1000;
        };
        terra.object.material.attributes.foliage.needsUpdate = true;
      };
    };

    this.handleBox = function(pos, color, scale){
      if(color === undefined){
        color = 0x00ff00;
      };
      if(scale === undefined){
        scale = 10;
      };
      var mesh = new THREE.Mesh(
        new THREE.BoxGeometry(scale, scale, scale),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 1
        })
      );
      mesh.position.copy(pos);
      return mesh;
    };

    this.buildPreview = function(terra, startPos, endPos, midPos, highlightHandle){
      if(midPos === undefined){
        midPos = new THREE.Vector3(
          startPos.x + ((endPos.x - startPos.x)/2),
          startPos.y + ((endPos.y - startPos.y)/2),
          0
        );
        var coord = terra.coord(midPos);
        midPos.z = coord.altitude;
      }
      var handles = [
          that.handleBox(new THREE.Vector3(
            midPos.x, 
            midPos.y, 
            midPos.z 
          ), highlightHandle === 0 ? that.data.handleGrabbedColor : that.data.handleColor,
          terra.data.scale)
        ];
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
      mesh.add(handles[0]);
      terra.object.add(mesh);
      that.underConstruction = mesh;
    };

  };
  snorb.tools.path.prototype = new snorb.core.Tool();

})();
