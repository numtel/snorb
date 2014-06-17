'use strict';

snorb.core.Representation = function(parent, data){
  var that = this;

  this.defaults = {};
  this.data = data = _.defaults(data || {}, this.defaults);

  this.key = data.key;
  this.polygon = data.polygon;

  if(parent !== undefined){
    while(this.key === undefined || parent.data.objects.hasOwnProperty(this.key)){
      this.key = snorb.util.randomString();
    };
    parent.data.objects[this.key] = this;

    // Only have remove method if this is registered under a parent
    this.remove = function(){
      delete parent.data.objects[this.key];
    };
  }

};
snorb.core.Representation.prototype = new snorb.core.State();
