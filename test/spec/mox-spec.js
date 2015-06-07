describe('The Mox library', function () {

  beforeEach(function () {
    angular.module('test', ['test1a'])
      .constant('constant', 'c1')
      .directive('directive', function () {
        return {
          scope: {
            key: '='
          },
          priority: 2,
          restrict: 'AE',
          template: '<div>Directive {{key}}</div>',
          link: angular.noop
        };
      })
      .directive('directive', function () {
        return {
          restrict: 'AEC',
          template: '<div>Second directive</div>'
        };
      })
      .directive('directive2', function () {
        return {
          restrict: 'A',
          template: '<div>Directive 2</div>'
        };
      });
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

  describe('mockDirectives()', function () {
    it('should mock the first registered directive with its "light" version', function () {

      mox
        .module('test')
        .mockDirectives('directive')
        .run();

      // All but the next directive properties are stripped
      expect(mox.inject('directiveDirective')[0]).toEqual({
        name: 'directive',
        $$isolateBindings: undefined,
        scope: {
          key: '='
        },
        priority: 2,
        index: 0,
        restrict: 'AE'
      });
    });

    it('should mock a the first registered directive with a newly defined version with some additional properties (name, scope, restrict and priority are not overwritable)', function () {
      var newLinkFn = angular.noop;
      mox
        .module('test')
        .mockDirectives({
          name: 'directive',
          scope: {
            otherKey: '='
          },
          restrict: 'A',
          priority: 3,
          template: '<div>New template</div>',
          link: newLinkFn
        })
        .run();

      expect(mox.inject('directiveDirective')[0]).toEqual({
        name: 'directive',
        $$isolateBindings: undefined,
        scope: {
          key: '='
        },
        priority: 2,
        index: 0,
        restrict: 'AE',
        template: '<div>New template</div>',
        link: newLinkFn
      });
    });

    describe('when there are multiple directives registered under the same name', function () {
      it('should remove al original directives except for the first', function () {
        mox
          .module('test')
          .mockDirectives('directive')
          .run();

        expect(mox.inject('directiveDirective')).toHaveLength(1);
        expect(mox.inject('directiveDirective')[0].restrict).toBe('AE');
      });
    });

    it('should mock multiple directives when passing multiple names or objects', function () {
      var newLinkFn = angular.noop;
      mox
        .module('test')
        .mockDirectives('directive', { name: 'directive2', link: newLinkFn })
        .run();

      // The restrict property is unique in this test example, so for readibility this property is used to identify mock
      expect(mox.inject('directiveDirective')[0].restrict).toBe('AE');
      expect(mox.inject('directive2Directive')[0].link).toBe(newLinkFn);
    });

    it('should throw an error when passing no arguments to mockDirectives', function () {
      expect(mox.mockDirectives).toThrow(Error('Please provide arguments'));
    });

  });
});
