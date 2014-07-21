describe('snorb.core.Scene', function() {
  it('requires <div id="game-test"> to be included in the test document', function(){
    var el = document.getElementById('game-test');
    expect(el).not.toBe(null);
  });

  var testData = {
    cameraPosition: {x: -123, y: 958, z: 992},
    cameraCenter: {x: 23, y: 491, z: 293},
    cursorRadius: 239,
    cursorVisible: true,
    cursorColor: {x:2, y:5, z: 9, w: 92}
  };
  var scene = new snorb.core.Scene('game-test', testData);

  it('should have appended a canvas to the dom element', function(){
    var el = document.getElementById('game-test');
    expect(el.children.length).toEqual(1);
    expect(el.children[0].nodeName).toEqual('CANVAS');
    expect(scene.domElement).toBe(el);
  });

  it('should set the data based on the constructor parameter', function(){
    _.each(testData, function(val, key){
      if(typeof val === 'object'){
        _.each(val, function(subVal, subKey){
          expect(scene.data[key][subKey]).toEqual(subVal);
        });
      }else{
        expect(scene.data[key]).toEqual(val);
      };
    });
  });

  xit('should move the cameraPosition and cameraCenter when panning', function(done){
    var terraMock = {
      object: {
        position: {
          x: 123,
          y: 239,
          z: 299
        }
      }
    };
    var newPos = {
      x: -192,
      y: 931,
      z: 919
    };
    setTimeout(function(){
      console.log(scene.camera.position);
      console.log(scene.controls.center);
      done();
    }, 3000);
  });

});
