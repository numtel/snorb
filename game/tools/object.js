'use strict';
(function(){
  snorb.tools.object = function(scene, data){
    var that = this;

    this.label = 'Place Object';

    this.defaults = {
      radius: 10,
      amount: 1,
      type: 'cube'
    };
    this.data = _.defaults(data || {}, this.defaults);

    this.types = {
      'cube': {
        label: 'Cube',
        mesh: function(terra) {

          var material = Physijs.createMaterial(                                      
            new THREE.MeshLambertMaterial({
              map: THREE.ImageUtils.loadTexture(snorb.textureDir + 'obj/plywood.jpg')
            }),
            .4, // low friction
            .6 // high restitution
          );
          material.map.wrapS = THREE.RepeatWrapping;
          material.map.repeat.set( .25, .25 );

          var size = (Math.random() * terra.data.scale * 3) + terra.data.scale;
          return new Physijs.BoxMesh(new THREE.BoxGeometry(size, size, size), material);
        }
      },
    };


    this.fieldDefinitions = {
      radius: {label: 'Radius', type: 'int', min: 5, max: 200},
      amount: {label: 'Amount', type: 'int', min: 1, max: 20},
      type: {label: 'Type', type: 'enum', values: function(){
                var values = {};
                _.each(this.types, function(type, key){
                  values[key] = type.label;
                });
                return values;
              }}
    };

    this.select = function(){
      scene.data.cursorRadius = this.data.radius;
      scene.data.cursorColor.copy(scene.defaults.cursorColor);
      scene.data.cursorVisible = true;
    };
    this.deselect = function(){
      that.mouseup();
      scene.data.cursorVisible = false;
    };

    this.stall = function(){
      that.mouseup();
      that.stalled = true;
    };

    this.mousemove = function(pos, terra, event){
      scene.data.cursorRadius = that.data.radius;
      if(pos === undefined && that.activeInterval !== undefined){
        // mouse has left the terrain
        that.stall();
        return;
      };
      that.lastPos = pos;
      if(that.stalled && pos && scene.mouseIsDown){
        // mouse has returned to the terrain
        that.mousedown(pos, terra, event);
      };
    };

    this.mousedown = function(pos, terra, event){
      var raiseAtCursor = function(){
        if(that.lastPos === undefined){
          // Pause if not on terrain
          that.stall();
          return;
        };
        for(var i = 0; i<that.data.amount; i++){
          var objPos = that.lastPos.clone();
          objPos.x += that.data.radius * 1.5 * (Math.random() - 0.5);
          objPos.y += that.data.radius * 1.5 * (Math.random() - 0.5);
          if(Math.abs(objPos.x) > terra.data.size.x * terra.data.scale / 2 ||
             Math.abs(objPos.y) > terra.data.size.y * terra.data.scale / 2){
            continue;
          };
          var coord = terra.coord(objPos);
          objPos.z = coord.altitude;
          that.rebuild(terra, {
            objectType: that.data.type,
            pos: objPos
          });
        };
      };
      that.stalled = undefined;
      that.mouseup();
      that.activeInterval = setInterval(raiseAtCursor, 100);
      raiseAtCursor();
    };

    this.buildMesh = function(type, terra){
      var typeInfo = this.types[type];
      return typeInfo.mesh(terra);
    };

    this.rebuild = function(terra, data){
      var mesh = that.buildMesh(data.objectType, terra);
      mesh.position.set(data.pos.x, data.pos.z, -data.pos.y);
      mesh.geometry.computeBoundingBox();
      mesh.position.y -= mesh.geometry.boundingBox.min.y - (terra.data.scale * 3);
      terra.scene.object.add(mesh);
    };

    this.mouseup = function(pos, terra, event){
      if(that.activeInterval){
        clearInterval(that.activeInterval);
        delete that.activeInterval;
      }
    };

  };
  snorb.tools.object.prototype = new snorb.core.Tool();

})();
