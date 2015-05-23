describe('The helper functions', function () {
  beforeEach(function () {

  });

  describe('Angular shortcuts', function () {
    describe('createScope()', function () {
      beforeEach(function () {
        mox.module('mox').run();
      });

      it('should return a new non-isolate scope', inject(function ($rootScope) {
        var newScope = createScope();
        expect(newScope.$id).not.toBe($rootScope.$id);
        expect(newScope.$parent).toBe($rootScope);
      }));

      it('should fill the scope with the parameters', function () {
        expect(createScope({ key: 'value', key2: 'value2' })).toEqual(jasmine.objectContaining({ key: 'value', 'key2': 'value2' }));
      });

      it('should set the created scope on the currentSpec', function () {
        var newScope = createScope();
        var anotherScope = createScope();
        expect(this.$scope).not.toBe(newScope);
        expect(this.$scope).toBe(anotherScope);
      });
    });

    describe('createController()', function () {
      beforeEach(function () {
        angular.module('mox')
          .service('FooService', function () {
            this.foo = 'bar';
          })
          .controller('FooController', function ($scope, FooService) {
            this.$scope = $scope;
            this.FooService = FooService;
          });
        mox.module('mox').run();
      });

      it('should instantiate a controller with the last created scope', function () {
        var newScope = createScope();
        var controller = createController('FooController');
        expect(controller.$scope).toBe(newScope);
        expect(controller.FooService.foo).toBe('bar');
      });

      it('should instantiate a controller with the given scope', inject(function () {
        var newScope = createScope();
        var anotherScope = createScope();
        var controller = createController('FooController', newScope);
        expect(controller.$scope).toBe(newScope);
        expect(controller.$scope).not.toBe(anotherScope);
      }));

      it('should override injections if passed', function () {
        var controller = createController('FooController', createScope(), { FooService: 'mocked service' });
        expect(controller.FooService).toBe('mocked service');
      });
    });
  });
});
