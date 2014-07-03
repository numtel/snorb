describe("snorb.core.Scene", function() {
  var scene = new snorb.core.Scene('game-test');
  it("should have appended a canvas to the dom element", function() {
    var el = document.getElementById('game-test').children;
    expect(el.length).toEqual(1);
    expect(el[0].nodeName).toEqual('CANVAS');
  });

});
