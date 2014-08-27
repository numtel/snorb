'use strict';
(function(){
  var createTerrainTool = function(label, ordinal){
    // ordinal can be a multiplier on the default raise terrain equation
    // or pass a function(nearby, vertices){} as ordinal for custom operation
    var terrainTool = function(scene, data){
      var that = this;

      this.label = label;

      this.defaults = {
        radius: 50,
        amount: 10,
        disabledCursorColor: new THREE.Vector4(0.7, 0.0, 0.0, 1.0)
      };
      this.data = _.defaults(data || {}, this.defaults);

      this.fieldDefinitions = {
        radius: {label: 'Radius', type: 'int', min: 5, max: 200},
        amount: {label: 'Amount', type: 'int', min: 1, max: 20}
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
        scene.data.cursorColor.copy(that.data.disabledCursorColor);
        that.stalled = true;
      };
      this.checkNearby = function(pos, terra){
        var nearby = terra.nearbyVertices(pos, that.data.radius / terra.data.scale),
            vertices = terra.object.geometry.vertices;
        // Check for objects
        var allPoints = [], polygon = [],
            convexHull = new ConvexHull();
        for(var r = 0; r<nearby.length; r++){
          for(var i = 0; i<nearby[r].length; i++){
            allPoints.push(new THREE.Vector2(
              vertices[nearby[r][i]].x, vertices[nearby[r][i]].y));
          };
        };
        convexHull.compute(allPoints);
        var hullPoints = convexHull.getIndices();
        for(var i = 0; i<hullPoints.length; i++){
          polygon.push(allPoints[hullPoints[i]].clone());
        };
        var overlap = terra.repres.checkPolygon(polygon);

        if(overlap.length === 0){
          return nearby;
        }else{
          return false;
        };
          
      };

      this.mousemove = function(pos, terra, event){
        scene.data.cursorRadius = that.data.radius;
        if(pos === undefined && that.activeInterval !== undefined){
          // mouse has left the terrain
          that.stall();
          return;
        };
        that.lastPos = pos;
        if(pos && that.checkNearby(pos, terra) === false){
          scene.data.cursorColor.copy(that.data.disabledCursorColor);
        }else{
          scene.data.cursorColor.copy(scene.defaults.cursorColor);
        };
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
          var nearby = that.checkNearby(that.lastPos, terra),
              vertices = terra.object.geometry.vertices;
          if(nearby === false){
            // Pause if overlapping anything
            that.stall();
            return;
          };
          
          // Perform operation
          if(typeof ordinal === "function"){
            ordinal.call(that, nearby, vertices);
          }else{
            for(var r = 0; r<nearby.length; r++){
              for(var i = 0; i<nearby[r].length; i++){
                vertices[nearby[r][i]].z += that.data.amount 
                                              * ((nearby.length - r) / nearby.length) 
                                              * ordinal;
                if(vertices[nearby[r][i]].z > terra.data.maxAlt){
                  vertices[nearby[r][i]].z = terra.data.maxAlt;
                }else if(vertices[nearby[r][i]].z < terra.data.minAlt){
                  vertices[nearby[r][i]].z = terra.data.minAlt;
               };
              };
            };
          }
          terra.updateVertices();
        };
        that.stalled = undefined;
        scene.data.cursorColor.copy(scene.defaults.cursorColor);
        that.mouseup();
        that.activeInterval = setInterval(raiseAtCursor, 100);
        raiseAtCursor();
      };
      this.mouseup = function(pos, terra, event){
        if(that.activeInterval){
          if(terra) {
            terra.rebuildMesh(true);
          };
          clearInterval(that.activeInterval);
          delete that.activeInterval;
        }
      };
    };
    terrainTool.prototype = new snorb.core.Tool();
    return terrainTool;
  };

  snorb.tools.terrainRaise = createTerrainTool('Raise Terrain', 1);
  snorb.tools.terrainLower = createTerrainTool('Lower Terrain', -1);
  snorb.tools.terrainSmooth = createTerrainTool('Smooth Terrain', 
    function(nearby, vertices){
      var altitudes = [];
      for(var r=0; r<nearby.length; r++){
        for(var i=0; i<nearby[r].length; i++){
          altitudes.push(vertices[nearby[r][i]].z);
        };
      };
      var averageAlt = _.reduce(altitudes, function(memo, num){
          return memo + num;
        }, 0) / altitudes.length;
      for(var r = 0; r<nearby.length; r++){
        for(var i = 0; i<nearby[r].length; i++){
          vertices[nearby[r][i]].z -= (vertices[nearby[r][i]].z - averageAlt) 
                                      * ((nearby.length - r) / nearby.length);
        };
      };
    });

})();
