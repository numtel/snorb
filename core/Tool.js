'use strict';

snorb.core.Tool = function(scene, data){
  this.options = {};
  this.select = function(){};
  this.deselect = function(){};
  this.mousemove = function(pos, terra, event){};
  this.mousedown = function(pos, terra, event){};
  this.mouseup = function(pos, terra, event){};
  this.reset = function(data){};
  this.prepareData = function(){};
};
snorb.core.Tool.prototype = new snorb.core.State();
