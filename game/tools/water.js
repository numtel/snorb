'use strict';

(function(){

  var createWaterTool = function(ordinal){
    // ordinal is multiple on amount to change water level by
    var waterTool = function(scene, data){
      var that = this;

      this.defaults = {
        amount: 10
      };
      this.data = data = _.defaults(data || {}, this.defaults);

      this.select = function(){
        scene.data.cursor.radius = 20;
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
          if(pos !== undefined){
            terra.adjustWaterLevel(pos, that.data.amount * ordinal);
          }
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
    waterTool.prototype = new snorb.core.Tool();
    return waterTool;
  };

  snorb.tools.waterRaise = createWaterTool(1);
  snorb.tools.waterLower = createWaterTool(-1);

})();
