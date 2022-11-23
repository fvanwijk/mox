function sum(a, b) {
  return a + b;
}

describe('sum()', function() {
  it('should sum', function() {
    expect(sum(1, 2)).toBe(3);
  });
});
