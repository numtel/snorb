'use strict';
(function(){
  var createTerrainTool = function(ordinal){
    // ordinal can be a multiplier on the default raise terrain equation
    // or pass a function(nearby, vertices){} as ordinal for custom operation
    var terrainTool = function(scene, data){
      var that = this;

      this.defaults = {
        radius: 50,
        amount: 10
      };
      this.data = data = _.defaults(data || {}, this.defaults);

      this.select = function(){
        scene.data.cursor.radius = this.data.radius;
        scene.data.cursor.visible = true;
      };
      this.deselect = function(){
        scene.data.cursor.visible = false;
      };
      this.mousemove = function(pos, terra, event){
        if(pos === undefined && that.activeInterval !== undefined){
          // mouse has left the terrain
          that.mouseup();
          that.stalled = true;
          return;
        };
        that.lastPos = pos;
        if(that.stalled && pos){
          // mouse has returned to the terrain
          that.stalled = undefined;
          that.mousedown(pos, terra, event);
        };
      };

      this.mousedown = function(pos, terra, event){
        var raiseAtCursor = function(){
          var nearby = terra.nearbyVertices(that.lastPos, that.data.radius / terra.data.scale),
              vertices = terra.object.geometry.vertices;
          if(typeof ordinal === "function"){
            ordinal.call(that, nearby, vertices);
          }else{
            for(var r = 0; r<nearby.length; r++){
              for(var i = 0; i<nearby[r].length; i++){
                vertices[nearby[r][i]].z += that.data.amount * (1 / (r + 1)) * ordinal;
              };
            };
          }
          terra.updateVertices();
        };
        that.mouseup();
        that.activeInterval = setInterval(raiseAtCursor, 100);
        raiseAtCursor();
      };
      this.mouseup = function(pos, terra, event){
        if(that.activeInterval){
          clearInterval(that.activeInterval);
          delete that.activeInterval;
        }
      };
    };
    terrainTool.prototype = new snorb.core.Tool();
    return terrainTool;
  };

  snorb.tools.terrainRaise = createTerrainTool(1);
  snorb.tools.terrainLower = createTerrainTool(-1);
  snorb.tools.terrainSmooth = createTerrainTool(function(nearby, vertices){
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
                                    * (1 / (r + 1));
      };
    };
  });

})();
