describe('The test', function() {
  beforeEach(function() {
    mox.module('mox').run();
  });

  it('should test', function() {
    const p = promise('result');
    p.then(function(res) {
      console.log(res);
    });
    expect(promise('result')).toResolve();
    expect(1).toBe(1);
  });
});
