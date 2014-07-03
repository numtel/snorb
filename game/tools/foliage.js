'use strict';
(function(){
  snorb.tools.foliage = function(scene, data){
    var that = this;

    this.label = 'Plant Forest';

    this.defaults = {
      radius: 10,
      amount: 1,
      type: 'spruce'
    };
    this.data = _.defaults(data || {}, this.defaults);

    this.types = {
      'spruce': {
        label: 'Spruce Tree',
        texture: 'spruce.png',
        width: 99 * 0.3,
        height: 241 * 0.3,
        sizeRandomness: 0.75,
        radius: 5
      },
      'beech': {
        label: 'Beech Tree',
        texture: 'beech.png',
        width: 157 * 0.3,
        height: 151 * 0.3,
        sizeRandomness: 0.75,
        radius: 5
      },
      'fir': {
        label: 'Fir Tree',
        texture: 'fir.png',
        width: 136 * 0.3,
        height: 207 * 0.3,
        sizeRandomness: 0.75,
        radius: 5
      },
      'oak': {
        label: 'Oak Tree',
        texture: 'oak.png',
        width: 193 * 0.15,
        height: 198 * 0.15,
        sizeRandomness: 0.75,
        radius: 5
      },
      'poplar': {
        label: 'Poplar Tree',
        texture: 'poplar.png',
        width: 100 * 0.3,
        height: 191 * 0.3,
        sizeRandomness: 0.75,
        radius: 5
      },
      'walnut': {
        label: 'Walnut Tree',
        texture: 'walnut.png',
        width: 153 * 0.2,
        height: 161 * 0.2,
        sizeRandomness: 0.75,
        radius: 5
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
          var treePos = that.lastPos.clone();
          treePos.x += that.data.radius * 1.5 * (Math.random() - 0.5);
          treePos.y += that.data.radius * 1.5 * (Math.random() - 0.5);
          if(Math.abs(treePos.x) > terra.data.size.x * terra.data.scale / 2 ||
             Math.abs(treePos.y) > terra.data.size.y * terra.data.scale / 2){
            continue;
          };
          var coord = terra.coord(treePos);
          treePos.z = coord.altitude;
          that.rebuild(terra, {
            foliageType: that.data.type,
            pos: treePos
          });
        };
      };
      that.stalled = undefined;
      that.mouseup();
      that.activeInterval = setInterval(raiseAtCursor, 100);
      raiseAtCursor();
    };

    this.buildMesh = function(type){
      var typeInfo = this.types[type];
      var material = new THREE.ShaderMaterial({
          uniforms: {
            texture: {type: 't', value: THREE.ImageUtils.loadTexture(
                      snorb.textureDir + 'foliage/' + typeInfo.texture)},
            highlight: {type: 'v3', value: new THREE.Vector3(0.0, 0.0, 0.0)}
          },
          vertexShader: snorb.util.shader('foliageVertex'),
          fragmentShader: snorb.util.shader('foliageFragment'),
          side: THREE.DoubleSide,
          transparent: true
        });
      var scale = 1 + ((Math.random() - 0.5) * typeInfo.sizeRandomness),
          w = scale * typeInfo.width,
          h = scale * typeInfo.height,
          mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
      mesh.add(mesh.clone());
      mesh.rotation.x = Math.PI/2;
      mesh.children[0].rotation.y = Math.PI / 2;
      return mesh;
    };

    this.rebuild = function(terra, data){
      var typeInfo = that.types[data.foliageType];
      var polygon = [
        {x: data.pos.x - typeInfo.radius, y: data.pos.y - typeInfo.radius},
        {x: data.pos.x - typeInfo.radius, y: data.pos.y + typeInfo.radius},
        {x: data.pos.x + typeInfo.radius, y: data.pos.y + typeInfo.radius},
        {x: data.pos.x + typeInfo.radius, y: data.pos.y - typeInfo.radius}
      ];

      var overlap = terra.repres.checkPolygon(polygon),
          landClear = true;
      for(var i = 0; i<overlap.length; i++){
        if(overlap[i].data.type !== 'water' ||
           data.pos.z < overlap[i].data.altitude){
          landClear = false;
          break;
        };
      };
      if(landClear === false){
        return false
      };

      var mesh = that.buildMesh(data.foliageType);
      mesh.position.copy(data.pos);
      mesh.geometry.computeBoundingBox();
      mesh.position.z -= mesh.geometry.boundingBox.min.y;
      // Random variance
      mesh.rotation.y += Math.PI * Math.random();
      mesh.rotation.z += Math.PI * (Math.random()-0.5) / 10;
      terra.object.add(mesh);

      var representation = terra.repres.register(polygon);
      representation.mesh = mesh;
      representation.data.type = 'foliage';
      representation.data.rebuildTool = 'foliage';
      representation.data.pos = data.pos;
      representation.data.foliageType = data.foliageType;
      representation.destroy = function(){
        terra.object.remove(this.mesh);
        that.prepareToUpdateTerra(terra);
      };
      representation.highlight = function(color){
        if(color === undefined){
          color = new THREE.Vector3(0,0,0);
        };
        mesh.material.uniforms.highlight.value.copy(color);
      };

      that.prepareToUpdateTerra(terra);
    };

    this.mouseup = function(pos, terra, event){
      if(that.activeInterval){
        clearInterval(that.activeInterval);
        delete that.activeInterval;
      }
    };

    this.activeUpdateTimer = undefined;
    this.prepareToUpdateTerra = function(terra){
      if(that.activeUpdateTimer){
        clearTimeout(that.activeUpdateTimer);
      };
      that.activeUpdateTimer = setTimeout(function(){
        that.updateTerraAttribute(terra);
        that.activeUpdateTimer = undefined;
      }, 1000);
    };

    this.updateTerraAttribute = function(terra){
      var densityWorker = new Worker("game/workers/foliageDensity.js");
      densityWorker.onmessage = function(event){
        for(var i = 0; i<event.data.length; i++){
          terra.object.material.attributes.foliage.value[i] = event.data[i];
        };
        terra.object.material.attributes.foliage.needsUpdate = true;
      };
      var allFoliage = [];
      _.each(terra.repres.data.objects, function(obj){
        if(obj.data.type === 'foliage'){
          allFoliage.push(obj.data.pos);
        };
      });
      densityWorker.postMessage({
        terraData: terra.data,
        foliage: allFoliage
      });
    };


  };
  snorb.tools.foliage.prototype = new snorb.core.Tool();

})();
