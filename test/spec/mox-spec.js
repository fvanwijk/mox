describe('The Mox library', function () {

  beforeEach(function () {
    angular.module('test', []);
    angular.module('test2', []);
  });

  describe('module()', function () {
    it('should pass the module functions to angular-mock.module', function () {
      spyOn(angular.mock.module, 'apply').and.callThrough();

      var configFn = function ($provide) {};
      mox.module('test', configFn, 'test2').run();
      expect(angular.mock.module.apply).toHaveBeenCalledWith(window, ['test', configFn, 'test2']);
    });

    it('should initialize the injector', function () {
      spyOn(angular.mock, 'inject').and.callThrough();
      mox.module('test', function ($provide) {}, 'test2').run();
      expect(angular.mock.inject).toHaveBeenCalled();
    });

  });
});
