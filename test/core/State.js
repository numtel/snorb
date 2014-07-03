describe("snorb.core.State", function() {
  var state = new snorb.core.State();
  it("should be able to reset and prepareData", function() {
    state.reset({horse: 'cow'});
    expect(state.data.horse).toEqual('cow');
    expect(state.prepareData().horse).toEqual('cow');

    state.reset();
    expect(state.data).toEqual(undefined);
    expect(state.prepareData()).toEqual(undefined);
  });

});
