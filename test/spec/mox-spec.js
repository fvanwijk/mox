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
      })
      .factory('factory', function () {
        return {
          methodA: angular.noop,
          methodB: angular.noop
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
      expect(mox.inject('directiveDirective')[0]).toEqual(jasmine.objectContaining({
        name: 'directive',
        scope: {
          key: '='
        },
        priority: 2,
        index: 0,
        restrict: 'AE'
      }));
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

      expect(mox.inject('directiveDirective')[0]).toEqual(jasmine.objectContaining({
        name: 'directive',
        scope: {
          key: '='
        },
        priority: 2,
        index: 0,
        restrict: 'AE',
        template: '<div>New template</div>',
        link: newLinkFn
      }));
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

  describe('disableDirectives()', function () {
    it('should mock al the directives with this name with an empty implementation', function () {
      mox
        .module('test')
        .disableDirectives('directive')
        .run();

      expect(mox.inject('directiveDirective')).toHaveLength(1);
      expect(mox.inject('directiveDirective')).toEqual({});
    });

    it('should mock multiple directives', function () {
      mox
        .module('test')
        .disableDirectives('directive', 'directive2')
        .run();

      expect(mox.inject('directiveDirective')).toEqual({});
      expect(mox.inject('directive2Directive')).toEqual({});
    });
  });

  describe('saveMock()', function () {
    var
      $provide,
      mockedFactory = 'mockedFactory',
      mockedConstant = 'mockedConstant';

    beforeEach(function () {
      mox
        .module('test', function (_$provide_) {
          $provide = _$provide_;
          spyOn($provide, 'value').and.callThrough();
          mox.save($provide, 'factory', mockedFactory);
          mox.save($provide, 'constant', mockedConstant, 'constant');
        })
        .run();
    });

    it('should register the mock as a value by default', function () {
      expect($provide.value).toHaveBeenCalledWith('factory', mockedFactory);
      expect(mox.inject('factory')).toBe(mockedFactory);
    });

    it('should register the mock with a specified recipe', function () {
      expect(mox.inject('constant')).toBe(mockedConstant);
    });

    it('should save the mock in the Mox cache', function () {
      expect(mox.get.constant).toBe(mockedConstant);
      expect(mox.get.factory).toBe(mockedFactory);
    });
  });

  describe('createMock()', function () {
    beforeEach(function () {
      jasmine.addMatchers({
        toBeSpy: function toBeSpy() {
          return {
            compare: function compareToBeSpy(actual) {
              var pass = false, message;
              if (angular.isFunction(actual)) {
                actual();
                if (actual.calls && actual.calls.any && actual.calls.any()) {
                  pass = true;
                  message = 'Expected ' + jasmine.pp(actual) + ' not to be a spy';
                } else {
                  message = 'Expected ' + jasmine.pp(actual) + ' to be a spy';
                }
              } else {
                message = 'Expected ' + jasmine.pp(actual) + ' to be a spy, but it is no function';
              }
              return {
                pass: pass,
                message: message
              };
            }
          };
        }
      });
    });

    it('should create a mock object with spy functions', function () {
      var mock = mox.createMock('factory', ['methodA', 'methodB'])();
      expect(mock.methodA).toBeSpy();
    });

    it('should create a function mock', function () {
      var mock = mox.createMock('filter', [])();
      expect(angular.noop).not.toBeSpy();
    });

    it('should create a constant/value mock', function () {
      var mock = mox.createMock('constant')();
      expect(mock).toBeUndefined();
    });

    describe('when provided $provide', function () {

      var $provide;

      beforeEach(function () {
        mox.module('test', function (_$provide_) {
          $provide = _$provide_;
        }).run();
        spyOn(mox, 'save');
      });

      it('should register the mock with Mox under its own name', function () {
        var mock = mox.createMock('filter', [])($provide);
        expect(mox.save).toHaveBeenCalledWith($provide, 'filter', mock, undefined);
      });

      it('should register the mock with Mox under an alias', function () {
        var mock = mox.createMock('filter', [])($provide, 'alias');
        expect(mox.save).toHaveBeenCalledWith($provide, 'alias', mock, undefined);
      });

      it('should register a constant mock as constant', function () {
        var mock = mox.createMock('constant')($provide);
        expect(mox.save).toHaveBeenCalledWith($provide, 'constant', mock, 'constant');
      });

    });

  });
});
