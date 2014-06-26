'use strict';
(function(){
  snorb.tools.demolish = function(scene, data){
    var that = this;

    this.label = 'Bulldozer';

    this.highlightColor = new THREE.Vector3(1,0,0);

    this.defaults = {
      radius: 10
    };
    this.data = _.defaults(data || {}, this.defaults);

    this.fieldDefinitions = {
      radius: {label: 'Radius', type: 'int', min: 5, max: 200}
    };

    this.select = function(){
      scene.data.cursorRadius = this.data.radius;
      scene.data.cursorColor.copy(scene.defaults.cursorColor);
      scene.data.cursorVisible = true;
      this.highlighted = [];
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
      that.highlight(terra, pos);
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
        for(var i = 0; i<that.highlighted.length; i++){
          that.highlighted[i].remove();
        };
      };
      that.stalled = undefined;
      that.mouseup();
      that.activeInterval = setInterval(raiseAtCursor, 100);
      raiseAtCursor();
    };

    this.highlighted = [];
    this.highlight = function(terra, pos){
      that.unHighlight();
      if(pos !== undefined){
        var repres = that.grabRepresentations(terra, pos);
        for(var i =0; i<repres.length; i++){
          if(repres[i].highlight){
            repres[i].highlight(that.highlightColor);
            that.highlighted.push(repres[i]);
          };
        };
      };
    };
    this.unHighlight = function(){
      for(var i = 0; i<that.highlighted.length; i++){
        that.highlighted[i].highlight();
      };
      that.highlighted = [];
    };

    this.grabRepresentations = function(terra, pos){
      var polygon = [
        {x: pos.x - that.data.radius, y: pos.y - that.data.radius},
        {x: pos.x - that.data.radius, y: pos.y + that.data.radius},
        {x: pos.x + that.data.radius, y: pos.y + that.data.radius},
        {x: pos.x + that.data.radius, y: pos.y - that.data.radius}
      ];

      var overlap = terra.repres.checkPolygon(polygon);
      _.filter(overlap, function(repres){
        return repres.data.type !== 'water';
      });
      return overlap;
    };

    this.mouseup = function(pos, terra, event){
      if(that.activeInterval){
        clearInterval(that.activeInterval);
        delete that.activeInterval;
      }
    };
  };
  snorb.tools.demolish.prototype = new snorb.core.Tool();

})();
