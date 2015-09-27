/**
 * Constructor function for a Mox object
 */
function MoxBuilder() {

  var
    moduleNames,
    moduleFns,
    postInjectFns;

  function execute() {
    var moduleResult;
    if (moduleFns.length) {
      moduleResult = angular.mock.module.apply(this, moduleFns);
      angular.mock.inject(); // to make sure that moduleFns had ran
    }
    postInjectFns.forEach(function (cb) { cb(); });
    return moduleResult;
  }

  /**
   * Reset the queues of moduleFns and postInejctFns so that next mox usage starts with a fresh new setup
   */
  function cleanUp() {
    moduleNames = [];
    moduleFns = [];
    postInjectFns = [];
  }

  function assertDeprecatedArguments (args) {
    if (!args[0]) {
      throw Error('Please provide arguments');
    }
  }

  function createResourceConstructor(resource) {
    // Create a mocked constructor that returns the mock itself plus the data that is provided as argument
    var fn = function (data) {
      return angular.extend({}, resource, data);
    };
    resource.constructor = jasmine.createSpy('constructor');
    if (currentSpec.isJasmine2) {
      resource.constructor.and.callFake(fn);
    } else {
      resource.constructor.andCallFake(fn);
    }
    angular.extend(resource.constructor, resource);

    return resource.constructor;
  }

  /**
   * For now a service is a resource when the name ends with resource
   * @param {Object} service
   * @returns {boolean}
   */
  function isFilter(service) {
    return angular.isFunction(service) && service.name !== 'Resource';
  }

  cleanUp();

  this.factories = moxConfig; // Factory functions for creating mocks
  this.get = {}; // Cache for mocked things
  this.testTemplateAppendSelector = '#mox-container';

  /**
   * Injects one or multiple services and returns them
   *
   * @param {string} name of the inject to get
   * @returns {Object}
   */
  this.inject = function inject(name) {
    if (!currentSpec.$injector) {
      throw Error('Sorry, cannot inject ' + name + ' because the injector is not ready yet. Please call mox.run() or inject()');
    }
    var args = Array.prototype.slice.call(arguments, 0);
    var injects = {};
    angular.forEach(args, function (injectName) {
      injects[injectName] = currentSpec.$injector.get(injectName);
    });
    return args.length === 1 ? injects[name] : injects;
  };

  /**
   * Saves modules or module config functions to be passed to angular.mocks.module when .run() is called.
   *
   * @returns {Object}
   */
  this.module = function module() {
    var args = Array.prototype.slice.call(arguments, 0);
    angular.forEach(args, function (arg) {
      if (angular.isString(arg)) {
        moduleNames.push(arg);
      }
    });

    moduleFns = moduleFns.concat(args);

    return this;
  };

  /**
   * Return module config function for registering mock services.
   * It creates mocks for resources and filters automagically.
   * The created mock is saved to the mox.get object for easy retrieval.
   *
   * @param {...string|string[]} mockName service(s) to mock
   */
  this.mockServices = function mockServices() {
    function getMethodNames(obj) {
      var methodNames = [];
      angular.forEach(obj, function (method, methodName) {
        if (angular.isFunction(method)) {
          methodNames.push(methodName);
        }
      });
      return methodNames;
    }

    function spyOnService(service) {
      if (isFilter(service)) {
        service = { filter: service };
        if (!service.filter.isSpy) {
          spyOn(service, 'filter');
        }
        service = service.filter;
      } else {
        angular.forEach(getMethodNames(service), function (methodName) {
          if (!service[methodName].isSpy) {
            spyOn(service, methodName);
          }
        });

        if (service.name === 'Resource') {
          service = createResourceConstructor(service);
        }
      }

      return service;
    }

    assertDeprecatedArguments(arguments);

    var mockNames = arguments;

    moduleFns.push(function mockServicesFn($provide) {
      angular.forEach(mockNames, function (mockName) {
        var mockArgs;
        if (angular.isArray(mockName)) {
          mockArgs = angular.copy(mockName);
          mockName = mockArgs.shift();
          mockArgs.unshift($provide);
        } else {
          mockArgs = [$provide];
        }

        if (mockName in mox.factories) {
          mox.factories[mockName].apply(this, mockArgs);
        } else {
          $provide.decorator(mockName, function ($delegate) {
            if (!(mockName in mox.get)) {
              $delegate = spyOnService($delegate);
              mox.get[mockName] = $delegate;
            }

            return $delegate;
          });

          // Make sure that the decorator function is called
          postInjectFns.push(function cacheMock() {
            mox.inject(mockName);
          });
        }
      });
    });

    return this;
  };

  /**
   * Register constants to be mocked and define their value. These mocks can be injected in a config function immediately.
   * Pass a name and value as parameters for one constant, or an object with definitions for multiple constants.
   *
   * @param {...string|Object} config
   */
  this.mockConstants = function mockConstants(config) {
    assertDeprecatedArguments(arguments);

    if (angular.isString(config)) {
      var key = arguments[0];
      config = {};
      config[key] = arguments[1];
    }

    moduleFns.push(function mockConstantsFn($provide) {
      angular.forEach(config, function (value, mockName) {
        mox.save($provide, mockName, value, 'constant');
      });
    });

    return this;
  };

  /**
   * Register directive(s) to be mocked. The mock will be an empty directive with the same isolate scope as the original directive,
   * so the isolate scope of the directive can be tested:
   *
   *   compiledElement.find('[directive-name]').toContainIsolateScope({ key: value });
   *
   * Accepts 3 types of input:
   * 1. a directive name: the same as with an array, but just for one directive
   * 2. a directive factory object, for your own mock implementation.
   *   - name property is required
   *   - template, templateUrl, require, controller, link and compile properties are overwritable
   * 3. an array of directive names (see 1) or objects (see 2)
   *
   * @param {...string|string[]|...Object|Object[]} directiveName directive(s) to mock
   * @returns {Object}
   */
  this.mockDirectives = function mockDirectives() {
    assertDeprecatedArguments(arguments);

    var directiveNames = arguments;

    moduleFns.push(function mockDirectivesFn($provide) {
      angular.forEach(directiveNames, function (directive) {
        var mock = angular.isString(directive) ? { name: directive } : directive;
        /*
         * Cannot use $compileProvider.directive because that does not override the original directive(s) with this name.
         * We decorate the original directive so that we can reuse the isolate bindings and other non-mockable DDO properties.
         */
        $provide.decorator(mock.name + 'Directive', function ($delegate) {
          angular.extend($delegate[0], {
            require: mock.require || undefined,
            template: mock.template || undefined,
            templateUrl: mock.templateUrl || undefined,
            transclude: mock.transclude || undefined,
            controller: mock.controller || undefined,
            compile: mock.compile || undefined,
            link: mock.link || undefined
          });

          // All directives are unregistered and replaced with this mock
          return [$delegate[0]];
        });
      });
    });

    return this;
  };

  /*
   * This function "disables" the given list of directives, not just mocking them
   * @param {string[]|string} directiveName directive(s) to disable
   * @returns {Object}
   */
  this.disableDirectives = function () {
    assertDeprecatedArguments(arguments);

    var directiveNames = arguments;

    moduleFns.push(function disableDirectivesFn($provide) {
      angular.forEach(directiveNames, function (directiveName) {
        $provide.factory(directiveName + 'Directive', function () { return {}; });
      });
    });

    return this;
  };

  /**
   * Registers controllers to be mocked. This is useful for view specs where the template contains an `ng-controller`.
   * The view's `$scope` is not set by the controller anymore, but you have to set the `$scope` manually.
   *
   * @param {...string|string[]} controllerName
   * @returns {Object}
   */
  this.mockControllers = function mockControllers() {
    assertDeprecatedArguments(arguments);

    var controllerNames = arguments;

    moduleFns.push(function ($controllerProvider) {
      angular.forEach(controllerNames, function (controllerName) {
        $controllerProvider.register(controllerName, angular.noop);
      });
    });

    return this;
  };

  /**
   * Replace templates that are loaded via ng-include with a single div that contains the template name.
   *
   * @param {...string|string[]|...Object|Object[]} template
   * @returns {Object}
   */
  this.mockTemplates = function mockTemplates() {
    assertDeprecatedArguments(arguments);

    var templates = arguments;

    postInjectFns.push(function () {
      var $templateCache = mox.inject('$templateCache');
      angular.forEach(templates, function (templateConfig) {
        var path;
        var template;
        if (angular.isString(templateConfig)) {
          path = templateConfig;
          template = '<div>This is a mock for ' + path + '</div>';
        } else {
          angular.forEach(templateConfig, function (val, key) {
            template = val;
            path = key;
          });
        }
        $templateCache.put(path, template);
      });
    });

    return this;
  };

  /*
   * Define return values or fake callback methods for methods of multiple mocks
   *
   * Usage:
   * mox.setupResults(function() {
   *   return {
   *     MockResource1: {
   *       get: mockResult
   *     },
   *     MockResource2: {
   *       query: fakeFunction
   *     },
   *     MockFilter: 'returnValueString' // object as return value not allowed!
   *   }
   * });
   *
   * @return {Object}
   */
  this.setupResults = function setupResults(configFn) {
    postInjectFns.push(function setupResultsFn() {
      var config = configFn();
      angular.forEach(config, function (mockConfig, mockName) {
        var mock = mox.inject(mockName);
        if (!(mockName in mox.get)) {
          throw new Error(mockName + ' is not in mox.get');
        }

        function setSpyResult(spy, returnValue) {
          if (typeof returnValue === 'function' || false) {
            if (currentSpec.isJasmine2) {
              spy.and.callFake(returnValue);
            } else {
              spy.andCallFake(returnValue);
            }
          } else {
            if (currentSpec.isJasmine2) {
              spy.and.returnValue(returnValue);
            } else {
              spy.andReturn(returnValue);
            }
          }
        }

        // Iterate over methods of mock
        if (typeof mockConfig === 'object' && mockConfig.constructor === Object) {
          angular.forEach(mockConfig, function (returnValue, method) {
            if (!(method in mock)) {
              throw new Error('Could not mock return value. No method ' + method + ' created in mock for ' + mockName);
            }
            setSpyResult(mock[method], returnValue);
          });
        } else { // the mock itself is a spy
          setSpyResult(mock, mockConfig);
        }
      });
    });

    return this;
  };

  /**
   * Executes the module config and post inject functions.
   *
   * @returns result of the angular.mock.module function
   */
  this.run = function run() {
    var moduleResult = execute();
    cleanUp();

    return moduleResult;
  };

  /**
   * Registers a mock and save it to the cache.
   * This method usually is used when defining a custom mock factory function or when manually creating a mock
   *
   * @param {Object} $provide
   * @param {string} mockName
   * @param {Object} mock
   * @param {string} recipe
   * @returns {*}
   */
  this.save = function saveMock($provide, mockName, mock, recipe) {
    recipe = recipe || 'value';
    $provide[recipe](mockName, mock);
    mox.get[mockName] = mock;
    return mock;
  };

  /**
   * Simple wrapper around jasmine.createSpyObj, ensures a new instance is returned for every call
   * @param {string} mockName the name of the service to register the mock for
   * @param {array} mockedMethods methods to create spies for on the mock. If mockedMethods is undefined,
   *                the mock itself will be a spy. If false, the mock will be undefined and registered as constant.
   *
   * @returns {Object}
   */
  this.createMock = function createMock(mockName, mockedMethods) {

    return function ($provide, nameOverride) {

      var mock = angular.isUndefined(mockedMethods) ? jasmine.createSpy(mockName) // Spy
        : (mockedMethods === false ?
          undefined // Value or constant
          : jasmine.createSpyObj(mockName, mockedMethods)); // Object with spies

      if ($provide) {
        mox.save($provide, nameOverride || mockName, mock, mockedMethods === false ? 'constant' : undefined);
      }

      return mock;
    };
  };

  /**
   * Creates a mock for angular $resources which can be initialized in the spec with a $provide
   * to immediately inject it into the current module. The instance functions ($get, etc) are added to the mock
   * as well, so this mock is used both as a "class" $resource and instance $resource.
   *
   * Usage example:
   *
   * // in MockServices
   * // ...
   * FooResource: createResourceMock('FooResource')
   * // ...
   *
   * // in a spec:
   *
   * fooResource = mox.module('...').register('FooResource').run();
   */
  this.createResourceMock = function createResourceMock(mockName, methodNames) {
    var allMethods = {};
    function addToMethodList(methodName) {
      allMethods[methodName] = methodName;
      allMethods['$' + methodName] = '$' + methodName;
    }
    angular.forEach(methodNames, addToMethodList);
    return function ($provide) {
      var mock = jasmine.createSpyObj(mockName, Object.keys(allMethods));

      mock = createResourceConstructor(mock);

      if ($provide) {
        mox.save($provide, mockName, mock.constructor);
      }

      return mock.constructor;
    };
  };

  return this;
}

var moxConfig = {};
angular.module('mox', [])
  .service('Mox', MoxBuilder);

var mox = angular.injector(['mox']).get('Mox');

beforeEach(function () {
  mox.get = {};
});
