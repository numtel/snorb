'use strict';

snorb.tools.terrainRaise = function(scene, data){
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
      that.mouseup();
      that.stalled = true;
      return;
    };
    that.lastPos = pos;
    if(that.stalled && pos){
      that.stalled = undefined;
      that.mousedown(pos, terra, event);
    };
  };

  this.mousedown = function(pos, terra, event){
    var raiseAtCursor = function(){
      var nearby = terra.nearbyVertices(that.lastPos, that.data.radius / terra.data.scale),
          vertices = terra.object.geometry.vertices;
      //console.log(nearby);
      for(var r = 0; r<nearby.length; r++){
        for(var i = 0; i<nearby[r].length; i++){
          vertices[nearby[r][i]].z += that.data.amount * (1 / (r + 1));
        };
      };
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
snorb.tools.terrainRaise.prototype = new snorb.core.Tool();
