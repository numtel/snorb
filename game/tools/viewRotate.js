'use strict';

snorb.tools.viewRotate = function(scene, data){
  this.label = 'Rotate View';
  this.select = function(){ scene.controls.userRotate = true; };
  this.deselect = function(){ scene.controls.userRotate = false; };
};
snorb.tools.viewRotate.prototype = new snorb.core.Tool();
