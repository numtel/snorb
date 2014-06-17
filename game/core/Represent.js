'use strict';

snorb.core.Represent = function(terra, data){
  var that = this;

  this.terra = terra;

  this.defaults = {
    objects: {}
  };
  this.data = _.defaults(data || {}, this.defaults);

  this.register = function(polygon){
    return new snorb.core.Representation(that, {
      polygon: polygon
    });
  };

  // Method generator
  var filterObjects = function(testFunc){
    return function(p){
      return _.filter(that.data.objects, function(obj){
        return testFunc(p, obj);
      });
    };
  };

  this.checkPolygon = filterObjects(function(polygon, obj){
    return window.polygon.intersection(polygon, obj.polygon).length > 0;
  });

  this.checkPoint = filterObjects(function(point, obj){
    return window.polygon.pointInside(point, obj.polygon, true);
  });

  this.prepareData = function(){
    var output = _.clone(this.data);
    output.objects = {};
    _.each(this.data.objects, function(obj, key){
      output.objects[key] = obj.prepareData();
    });
    return output;
  };

  // This method must be called after initialization do to back-references in terra
  this.buildObjectsInData = function(){
    var objects = _.clone(that.data.objects);
    that.data.objects = {};
    _.each(objects, function(obj, key){
      terra.buildObject(obj);
    });
  };

  this.reset = function(data){
    // remove all current objects
    _.each(this.data.objects, function(obj){
      obj.remove();
    });
    if(data === undefined){
      this.data = _.clone(this.defaults);
    }else{
      this.data = _.clone(data);
      this.buildObjectsInData();
    };
  };

};
snorb.core.Represent.prototype = new snorb.core.State();
