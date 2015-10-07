angular.extend(moxConfig, {
  factory2: mox.createMock('factory2', ['methodA']),
  factory3: function ($provide, mock) {
    $provide.value('factory3', mock);
  }
});

describe('The Mox library', function () {

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

  beforeEach(function () {
    angular.module('test', ['test1a', 'ngResource'])
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
          methodA: function () {
            return 'methodAResult';
          },
          methodB: angular.noop
        };
      })
      .filter('filter2', function () {
        return function () {
          return 'filterResult';
        };
      })
      .factory('FooResource', function ($resource) {
        return $resource('path');
      })
      .controller('controller', function ($scope) {
        $scope.name = 'testController';
      })
      .controller('controller2', function ($scope) {
        $scope.name = 'testController2';
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

  describe('mockServices()', function () {
    describe('when mocking a service', function () {
      it('should manually mock a service that is in moxConfig using the mock factory function', function () {
        mox
          .module('test')
          .mockServices('factory2')
          .run();

        expect(mox.inject('factory2').methodA).toBeSpy();
        expect(mox.inject('factory2').methodB).not.toBeSpy();
      });

      it('should automatically mock a service that is not in moxConfig using the original service and store it in the cache', function () {
        mox
          .module('test')
          .mockServices('factory')
          .run();

        expect(mox.get.factory.methodA).toBeSpy();
        expect(mox.inject('factory').methodA).toBeSpy();
        expect(mox.inject('factory').methodB).toBeSpy();
      });

      it('should replace the service with a service that has spies on its methods, so that "calling through" is possible', function () {
        mox
          .module('test')
          .mockServices('factory')
          .run();

        var spy = mox.inject('factory').methodA;
        spy.and.callThrough();
        expect(spy()).toBe('methodAResult');
      });
    });

    describe('when mocking filters (and other functions)', function () {
      beforeEach(function () {
        mox
          .module('test')
          .mockServices('filter2Filter')
          .run();
      });

      it('should mock the filter with a spy', function () {
        var filter = mox.inject('filter2Filter');
        expect(filter).toBeSpy();
        expect(filter()).toBeUndefined();
      });

      it('should support calling through', function () {
        var filter = mox.inject('filter2Filter');
        filter.and.callThrough();
        expect(filter()).toBe('filterResult');
      });

      it('is stored in the cache', function () {
        expect(mox.get.filter2Filter).toBeSpy();
      });
    });

    describe('when mocking a resource', function () {

      function getResource() {
        return mox.inject('FooResource');
      }

      beforeEach(function () {
        mox
          .module('test')
          .mockServices('FooResource')
          .run();
      });

      it('should mock the resource and set the resource methods on the mock', function () {
        expect(getResource().get).toBeSpy();
      });

      it('should mock the resource, which can be constructed and returns the same mock with the passed data', function () {
        var FooResource = getResource();
        var mockInstance = new FooResource({ data: 'value' });

        expect(mockInstance.data).toBe('value');
        expect(mockInstance.get).toBeSpy();
      });

      it('should support calling through', function () {
        var FooResource = getResource();
        FooResource.get.and.callThrough();

        requestTest()
          .whenMethod(FooResource.get)
          .expectGet('path')
          .run();

        var mockInstance = new FooResource({ data: 'value' });

        requestTest()
          .whenMethod(mockInstance.get)
          .expectGet('path')
          .run();
      });

      it('should make $-methods so that you can use then whem mocking a resource instance', function () {
        expect(getResource().$get).toBeSpy();
      });

      it('is stored in the cache', function () {
        expect(mox.get.FooResource.get).toBeSpy();
      });
    });

    describe('when passing an array, where the first value is the mock name and the other values represent arguments', function () {
      beforeEach(function () {
        mox
          .module('test')
          .mockServices(
            ['factory3', 'argument'],
            ['factory', 'argument']
          )
          .run();
      });

      it('should call the mock factory function with the passed arguments', function () {
        expect(mox.inject('factory3')).toBe('argument');
      });

      describe('when there is no custom factory function', function () {
        it('should do nothing with the extra arguments', function () {
          expect(mox.inject('factory').methodA).toBeSpy();
        });
      });
    });

    describe('when passing multiple mock names', function () {
      beforeEach(function () {
        mox
          .module('test')
          .mockServices(
            'factory',
            'filter2Filter',
            'FooResource'
          )
          .run();
      });

      it('should mock them all', function () {
        expect(mox.inject('factory').methodA).toBeSpy();
        expect(mox.inject('filter2Filter')).toBeSpy();
        expect(mox.inject('FooResource').get).toBeSpy();
      });
    });

    it('should throw an error when providing no arguments', function () {
      expect(mox.mockServices).toThrow(Error('Please provide arguments'));
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

    it('should throw an error when providing no arguments', function () {
      expect(mox.mockConstants).toThrow(Error('Please provide arguments'));
    });

    it('is stored in the cache', function () {
      mox
        .module('test')
        .mockConstants('constant', 'newConstant')
        .run();

      expect(mox.get.constant).toBe('newConstant');
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
        require: undefined,
        controller: undefined,
        templateUrl: undefined,
        template: undefined,
        link: undefined,
        transclude: undefined,
        compile: undefined,
        priority: 2,
        index: 0,
        restrict: 'AE'
      }));
    });

    it('should mock a the first registered directive with a newly defined version with some additional properties (name, scope, restrict and priority are not overwritable)', function () {
      var newLinkFn = function newLink() {};
      var newCompileFn = function newCompile() {};
      var newControllerFn = function newController() {};
      mox
        .module('test')
        .mockDirectives({
          compile: newCompileFn,
          controller: newControllerFn,
          link: newLinkFn,
          name: 'directive',
          priority: 3,
          require: 'siblingDirectiveName',
          restrict: 'A',
          scope: {
            otherKey: '='
          },
          template: '<div>New template</div>',
          templateUrl: 'url',
          transclude: true
        })
        .run();

      expect(mox.inject('directiveDirective')[0]).toEqual(jasmine.objectContaining({
        compile: newCompileFn,
        controller: newControllerFn,
        index: 0,
        link: newLinkFn,
        name: 'directive',
        priority: 2,
        require: 'siblingDirectiveName',
        restrict: 'AE',
        scope: {
          key: '='
        },
        template: '<div>New template</div>',
        templateUrl: 'url',
        transclude: true
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

    it('should throw an error when providing no arguments', function () {
      expect(mox.disableDirectives).toThrow(Error('Please provide arguments'));
    });
  });

  describe('mockControllers()', function () {
    it('should mock a controller with an empty implementation', function () {
      mox
        .module('test')
        .mockControllers('controller')
        .run();

      var $scope = createScope();
      mox.inject('$controller')('controller', $scope); // Controller sets $scope.name = 'testController';
      expect($scope.name).toBeUndefined();
    });

    it('should mock multiple controllers', function () {
      mox
        .module('test')
        .mockControllers('controller', 'controller2')
        .run();

      var $scope = createScope();
      mox.inject('$controller')('controller', $scope); // Controller sets $scope.name = 'testController';
      expect($scope.name).toBeUndefined();
      mox.inject('$controller')('controller2', $scope); // Controller sets $scope.name = 'testController2';
      expect($scope.name).toBeUndefined();
    });

    it('should throw an error when providing no arguments', function () {
      expect(mox.mockControllers).toThrow(Error('Please provide arguments'));
    });
  });

  describe('mockTemplates', function () {
    function mockTemplate(config) {
      mox
        .module('test')
        .mockTemplates(config)
        .run();

      createScope();
    }

    it('should mock a template and replace it with a simple alternative containing the template name', function () {
      mockTemplate('template.html');
      compileTemplate('template.html');

      expect(this.element).toHaveText('This is a mock for template.html');
    });

    it('should mock a template with a defined alternative', function () {
      mockTemplate({ 'template.html': '<div>template</div>' });
      compileTemplate('template.html');
      expect(this.element).toHaveText('template');
    });

    it('should support multiple mocks', function () {
      mox
        .module('test')
        .mockTemplates('template.html', { 'template2.html': '<div>template</div>' })
        .run();

      createScope();

      expect(compileTemplate('template.html')).toHaveText('This is a mock for template.html');
      expect(compileTemplate('template2.html')).toHaveText('template');
    });
  });

  describe('setupResults()', function () {
    function setupResults(mockServices, factory) {
      mockServices = mockServices !== false;
      factory = factory || {
          methodA: 'mockResult',
          methodB: _.constant('mockResult B')
        };

      var test = mox.module('test');
      if (mockServices) {
        test.mockServices('factory', 'filter2Filter');
      }
      return test.setupResults(function () {
        return {
          factory: factory,
          filter2Filter: _.constant('filterResult mock')
        };
      })
      .run;
    }

    it('should setup results for the spy object spy', function () {
      setupResults()();
      expect(mox.get.factory.methodA()).toBe('mockResult');
    });

    it('should setup a fake method for the spy object spy', function () {
      setupResults()();
      expect(mox.get.factory.methodB()).toBe('mockResult B');
    });

    it('should setup a fake method for the spy', function () {
      setupResults()();
      expect(mox.get.filter2Filter()).toBe('filterResult mock');
    });

    it('should throw an error if you want to setup result for a non-existing mock', function () {
      expect(setupResults(false, {
        methodA: {}
      })).toThrow(Error('factory is not in mox.get'));
    });

    it('should throw an error if you want to mock a non-existent method', function () {
      expect(setupResults(true, {
        methodC: {}
      })).toThrow(Error('Could not mock return value. No method methodC created in mock for factory'));
    });
  });

  describe('get', function () {
    it('should clear the cache every test', function () {
      expect(mox.get).toEqual({});
    });
  });

  describe('saveMock()', function () {
    var
      $provide,
      mockedFactory = { factory: { methodA: 'mockedFactory' } },
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
    it('should create a mock object with spy functions', function () {
      var mock = mox.createMock('factory', ['methodA', 'methodB'])();
      expect(mock.methodA).toBeSpy();
    });

    it('should create a function mock', function () {
      var mock = mox.createMock('filter')();
      expect(angular.noop).not.toBeSpy();
    });

    it('should create a constant/value mock', function () {
      var mock = mox.createMock('constant', false)();
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
        var mock = mox.createMock('filter')($provide);
        expect(mox.save).toHaveBeenCalledWith($provide, 'filter', mock, undefined);
      });

      it('should register the mock with Mox under an alias', function () {
        var mock = mox.createMock('filter')($provide, 'alias');
        expect(mox.save).toHaveBeenCalledWith($provide, 'alias', mock, undefined);
      });

      it('should register a constant mock as constant', function () {
        var mock = mox.createMock('constant', false)($provide);
        expect(mox.save).toHaveBeenCalledWith($provide, 'constant', mock, 'constant');
      });

    });

  });

  describe('createResourceMock()', function () {

    var $provide;

    beforeEach(function () {
      mox.module('test', function (_$provide_) {
        $provide = _$provide_;
      }).run();
      spyOn(mox, 'save');
    });

    it('should create a resource mock with $resource methods as unconfigured spies', function () {
      // Pass 'get' two times to test the unique filtering using Object
      var mock = mox.createResourceMock('FooResource', ['get', 'get'])();
      expect(mock.get).toBeSpy();
      expect(mock.get()).toBeUndefined();
      expect(mock.$get()).toBeUndefined();
    });

    it('should create a resource mock that can be constructed and returns the same mock with the passed data', function () {
      var Mock = mox.createResourceMock('FooResource', ['get'])();
      var mockInstance = new Mock({ data: 'value' });

      expect(mockInstance.data).toBe('value');
      expect(mockInstance.get).toBeSpy();
      expect(mockInstance.$get).toBeSpy();
    });

    it('should register the mock when $provide is passed', function () {
      var mock = mox.createResourceMock('FooResource', ['get'])($provide);
      expect(mox.save).toHaveBeenCalledWith($provide, 'FooResource', mock);
    });
  });
});
