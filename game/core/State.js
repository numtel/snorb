'use strict';

snorb.core.State = function(data){
  this.reset = function(data){
    if(this.defaults){
      this.data = _.defaults(data || {}, this.defaults);
    }else{
      this.data = data;
    };
  };
  this.prepareData = function(){
    return _.clone(this.data);
  };
};
