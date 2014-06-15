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
    that.lastPos = pos;
  };

  this.mousedown = function(pos, terra, event){
    console.log('down!');
    var raiseAtCursor = function(){
      var nearby = terra.nearbyVertices(that.lastPos, that.data.radius / terra.data.scale),
          vertices = terra.object.geometry.vertices;
      //console.log(nearby);
      for(var r = 0; r<nearby.length; r++){
        for(var i = 0; i<nearby[0].length; i++){
          vertices[nearby[r][i]].z += that.data.amount * (1 / (r + 1));
        };
      };
      terra.updateVertices();
    };
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
