'use strict';

snorb.core.Represent = function(data){
  var that = this;

  this.defaults = {
    size: new THREE.Vector2(150, 100),
    position: new THREE.Vector3(0, 0, 0),
    scale: 10,
    altitude: 100,
    objects: {}
  };
  this.data = data = _.defaults(data || {}, this.defaults);

  this.register = function(polygon){
    var key;
    while(key === undefined || data.objects.hasOwnProperty(key)){
      key = snorb.util.randomString();
    };
    var object = {
      polygon: polygon,
      key: key
    };
    data.objects[key] = object;
    return object;
  };

  // Method generator
  var filterObjects = function(testFunc){
    return function(p){
      return _.filter(data.objects, function(obj){
        return testFunc(p, obj);
      });
    };
  };

  this.checkPolygon = filterObjects(function(polygon, obj){
    return snorb.polygon.intersection(polygon, obj.polygon).length > 0;
  });

  this.checkPoint = filterObjects(function(point, obj){
    return snorb.polygon.pointInside(point, obj.polygon, true);
  });

};
snorb.core.Represent.prototype = new snorb.core.State();
