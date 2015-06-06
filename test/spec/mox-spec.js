describe('The Mox library', function () {

  beforeEach(function () {
    angular.module('test', ['test1a'])
      .constant('constant', 'c1');
    angular.module('test1a', []);
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

  describe('mockConstants()', function () {
    it('should mock a constant which is mocked for the same module as the original constant', function () {
      mox
        .module('test')
        .mockConstants('constant', 'newConstant')
        .run();

      expect(mox.inject('constant')).toEqual('newConstant');
    });
  });
});
