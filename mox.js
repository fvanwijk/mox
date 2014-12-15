/* jshint strict:false */
/* jshint unused:false */
/* jshint -W020, -W079 */
var moxConfig = {};

/**
 * Mox mocking framework with the X from Xebia (and it contains less characters, so saves bytes!)
 * This will be moved to a separate library and included via Bower soon.
 */
function MoxBuilder() {

  this.moduleFns = [];

  return this;
}

/**
 * Saves modules or module config functions to be passed to angular.mocks.module when .go() is called.
 *
 * @returns {Object}
 */
MoxBuilder.prototype.module = function module() {
  this.moduleFns = Array.prototype.slice.call(arguments, 0);
  this.get = {};

  return this;
};

/**
 * Return module config function for registering mock services.
 * It creates mocks for resources and filters automagically.
 * The created mock is saved to the mox.get object for easy retrieval.
 *
 * @param {string|string[]} mockNames
 */
MoxBuilder.prototype.mockServices = function MockServices(mockNames) {
  mockNames = [].concat(mockNames);

  var registerFn = function ($provide) {
    angular.forEach(mockNames, function (mockName) {
      var mockArgs = [$provide];

      if (angular.isArray(mockName)) {
        var mockArgs = angular.copy(mockName).concat(mockArgs);
        mockName = mockArgs.pop();
      }

      if (mockName in mox.factories) {
        mox.factories[mockName].apply(this, mockArgs);
      } else if (mockName.indexOf('Resource', mockName.length - 8) !== -1) {
        mox.createResourceMock(mockName)($provide);
      } else if (mockName.indexOf('Filter', mockName.length - 6) !== -1) {
        mox.createMock(mockName)($provide);
      } else {
        throw new Error('Mock ' + mockName + ' does not exist. Is it in MoxConfig with the correct casing?');
      }
    });
  };

  this.moduleFns.push(registerFn);

  return this;
};

/**
 * Register directive(s) to be mocked.
 *
 * Accepts 3 types of input:
 * 1. a directive name: the same as with an array, but just for one directive
 * 2. a directive factory object, for you won mock implementation (name property is required)
 * 3. an array of directive names (see 1) or objects (see 2)
 *
 * @param {string[]|string|Object[]|Object} directives Array of directives
 * @returns {Object}
 */
MoxBuilder.prototype.mockDirectives = function mockDirectives(directives) {
  directives = [].concat(directives);
  var directiveFn = function directiveFn($provide) {
    angular.forEach(directives, function (directive) {
      var mock = angular.isString(directive) ? { name: directive } : directive;
      mock = _.defaults(mock, {
        priority: 0,
        restrict: 'EAC',
        template: '<div class="mock-' + mock.name + '">this is a ' + mock.name + '</div>'
      });
      $provide.factory(mock.name + 'Directive', function factory() {
        return [mock];
      });
    });
  };

  this.moduleFns.push(directiveFn);

  return this;
};

/*
 * This function "disables" the given list of directives, not just mocking them
 * @param {string[]|string} directives directives to disable
 * @returns {Object}
 */
MoxBuilder.prototype.disableDirectives = function (directives) {
  directives = [].concat(directives);
  var directiveFn = function directiveFn($provide) {
    angular.forEach(directives, function (directive) {
      $provide.factory(directive + 'Directive', function() { return {}; });
    });
  };

  this.moduleFns.push(directiveFn);

  return this;
};

/**
 * Registers a controller to be mocked. This is useful for view specs where the template contains an `ng-controller`.
 * The view's `$scope` is not set by the controller anymore, but you have to set the `$scope` manually.
 *
 * @param {string} controllerName
 * @returns {Object}
 */
MoxBuilder.prototype.mockController = function mockController(controllerName) {
  var controllerFn = function ($controllerProvider) {
    $controllerProvider.register(controllerName, noop);
  };

  this.moduleFns.push(controllerFn);

  return this;
};

/**
 * Executes the module config functions.
 *
 * @returns result of the angular.mocks.module function
 */
MoxBuilder.prototype.go = function go() {
  var moduleResult = module.apply(this, this.moduleFns);
  inject();
  return moduleResult;
};

/**
 * Replace templates that are loaded via ng-include with a single div that contains the template name.
 *
 * @param {string|string[]|Object|Object[]} templates
 * @returns {Object}
 */
MoxBuilder.prototype.mockTemplates = function mockTemplates(templates) {
  var $templateCache = injectEnv('$templateCache');
  templates = [].concat(templates);
  angular.forEach(templates, function (templateConfig) {
    var path;
    var template;
    if (angular.isString(templateConfig)) {
      path = templateConfig;
      template = '<div>This is a mock for ' + path + '</div>';
    } else {
      angular.forEach(templateConfig, function(template, path) {
        return;
      });
    }
    $templateCache.put(path, template);
  });

  return this;
};

/*
 * Define return values or fake callback methods for methods of multiple mock
 *
 * Usage:
 * mox().setupResults({
 *   MockResource1: {
 *     get: mockResult
 *   },
 *   MockResource2: {
 *     query: fakeFunction
 *   },
 *   MockFilter: 'returnValueString' // object as return value not allowed!
 * });
 *
 * @return {Object}
 */
MoxBuilder.prototype.setupResults = function setupResults(config) {
  angular.forEach(config, function (mockConfig, mockName) {
    var mock = mox.get[mockName];

    function setSpyResult(spy, returnValue) {
      if (typeof returnValue == 'function' || false) {
        spy.andCallFake(returnValue);
      } else {
        spy.andReturn(returnValue);
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

  return this;
};

function mox() {
  return new MoxBuilder();
}

mox.factories = moxConfig; // Factory functions for creating mocks
mox.get = {}; // Cache for mocked things

/**
 * Registers a mock and save it to the cache.
 * This method usually is used when defining a custom mock factory function or when manually creating a mock
 *
 * @param $provide
 * @param {string} mockName
 * @param {Object} mock
 * @returns {*}
 */
mox.save = function saveMock($provide, mockName, mock) {
  $provide.value(mockName, mock);
  mox.get[mockName] = mock;
  return mock;
};

/**
 * Simple wrapper around jasmine.createSpyObj, ensures a new instance is returned for every call
 *
 * @returns {Object}
 */
mox.createMock = function createMock(mockName, mockedMethods) {
  return function ($provide, nameOverride) {
    var mock = (mockedMethods) ? jasmine.createSpyObj(mockName, mockedMethods) : jasmine.createSpy(mockName);
    if ($provide) {
      mox.save($provide, nameOverride ? nameOverride : mockName, mock);
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
 * fooResource = mox().module('...').register('FooResource').go();
 */
mox.createResourceMock = function createResourceMock(mockName, optionalMethods) {
  var defaultMethods = ['get', 'query', 'save', 'update', 'remove', 'delete'];
  var allStaticMethods = _.union(defaultMethods, optionalMethods || []);
  var allInstanceMethods = [];
  angular.forEach(allStaticMethods, function (method) {
    allInstanceMethods.push('$' + method);
  });
  return function ($provide) {
    var mock = jasmine.createSpyObj(mockName, _.union(allStaticMethods, allInstanceMethods, ['constructor']));

    // Create a mocked constructor that returns the mock itself plus the data that is provided as argument
    mock.constructor.andCallFake(function (data) {
      var constructor = angular.copy(mock);
      angular.extend(constructor, data);
    });

    angular.extend(mock.constructor, mock);

    if ($provide) {
      $provide.value(mockName, mock.constructor);
      mox.get[mockName] = mock;
    }

    return mock.constructor;
  };
};

/*******************************
 * Helper functions *
 *******************************/

/**
 * Injects a service.
 * If the injector is not yet initialized, it will be initialized. This has as side effect that the module config
 * functions are called.
 *
 * @param {string} name of the inject to get
 * @returns service
 */
function injectEnv(name) {
  // Lazy loading of inject environment. Not possible when in config phase, because 'inject' invokes the module function!
  if (jasmine.getEnv().currentSpec.$injector === undefined) {
    inject();
  }
  return jasmine.getEnv().currentSpec.$injector.get(name);
}

// use jasmine.successCallback / failureCallback to test .then callbacks and with which arguments
// they were called. Use 'mostRecentCall.args' to do other stuff with arguments,
// or use jasmine-stealth's Argument Captors (https://github.com/searls/jasmine-stealth)
beforeEach(function initHandlerCallbacks() {
  jasmine.successCallback = jasmine.createSpy('success callback');
  jasmine.failureCallback = jasmine.createSpy('failure callback');
});

/**
 * Copies input. When input seems to be JSON data, it is fastcopied.
 *
 * @param {*} input
 * @returns {*}
 */
function copy(input) {
  if (angular.isObject(input) && !angular.isFunction(input)) {
    return JSON.parse(JSON.stringify(input));
  }
  return angular.copy(input);
}

/*******************************
 * Generic shortcuts for specs *
 *******************************/

/**
 * Create a new scope that is a child of $rootScope.
 *
 * @param {Object} [params] optional variables to bind to the $scope
 * @returns {Object}
 */
function createScope(params) {
  var $scope = injectEnv('$rootScope').$new();
  if (params) {
    angular.extend($scope, params);
  }
  return $scope;
}

/**
 * Creates a controller and runs the controller function.
 *
 * @param {string} ctrlName controller to create
 * @param {Object} $scope variables to bind to injected $scope initially
 * @param {Object} [locals] optional local injections
 * @returns {*}
 */
function createController(ctrlName, $scope, locals) {
  return injectEnv('$controller')(ctrlName, angular.extend({ $scope: $scope }, locals || {}));
}

/**
 * Mock the current date.
 * Specs that use momentjs or Date depend on the current date
 * will introduce unreliable behaviour when the current date is not mocked.
 * @param {string} dateString
 */
function mockDate(dateString) {
  var clock;

  beforeEach(function () {
    clock = sinon.useFakeTimers(+moment(dateString));
  });

  afterEach(function () {
    clock.restore();
  });
}

function getMockData(path) {
  return copy(getJSONFixture(path));
}

function noop() {}

/*********************
 * Compile shortcuts *
 *********************/

/**
 * Compile a template and digest the $scope
 *
 * @param {string} template name
 * @param {Object} $scope to bind to the template
 * @returns the created element
 */
function compileTemplate(template, $scope) {
  var element = injectEnv('$compile')('<div>' + injectEnv('$templateCache').get(template) + '</div')($scope);
  $scope.$digest();
  return element;
}

/**
 * Compile HTML and digest the scope (for example a directive)
 *
 * @param {string} html
 * @param {Object} $scope to bind to the element
 * @returns the created element
 */
function compileHtml(html, $scope) {
  var element = injectEnv('$compile')(html)($scope);
  $scope.$digest();
  return element;
}

/**
 * Compiles given html on the actual browser's DOM using window.document instead of an isolated tree.
 * The regular compileHtml() function is preferred as it's faster and does not require manual cleanup.
 * Only use this function when you cannot trigger browser behaviour using compileHtml().
 *
 * Be sure to clean up the generated HTML afterwards by calling removeCompiledHtmlFromDom() in an afterEach.
 * @param {string} html
 * @param {Object} $scope
 * @returns the created element on window.document.body.
 */
function compileHtmlOnDom(html, $scope) {
  var element = compileHtml(html, $scope);
  var body = injectEnv('$document').find('body');

  var containerId = 'test-input-container';
  var findElementContainer = function () {
    return body.find('#' + containerId);
  };

  if (findElementContainer().length < 1) {
    body.append('<div id="' + containerId + '"></div>');
  }
  findElementContainer().append(element);

  return element;
}

/**
 * Remove the html that was created using compileHtmlOnDom() from the DOM
 */
function removeCompiledHtmlFromDom() {
  return injectEnv('$document').find('body').find('#test-input-container').remove();
}

/*********************
 * Promise shortcuts *
 *********************/

function defer() {
  return injectEnv('$q').defer();
}

function when() {
  /* jshint -W040 */
  return injectEnv('$q').when.apply(this, arguments);
}

function all() {
  return injectEnv('$q').all.apply(this, arguments);
}

function unresolvedPromise() {
  return defer().promise;
}

function promise(result, dontCopy) {
  var deferred = defer();
  deferred.resolve(dontCopy ? result : copy(result));
  return deferred.promise;
}

function restangularPromise(result) {
  return injectEnv('$q').when(angular.copy(result));
}

/**
 * A resolved $resource promise must contain $-methods, so JSON-copy is not possible
 */
function resourcePromise(result) {
  var deferred = defer();
  deferred.resolve(angular.copy(result));
  return deferred.promise;
}

function reject(error) {
  return injectEnv('$q').reject(error);
}

/**
 * Create a $resource instance mock that is a result from a $resource method
 * The second argument must be the mock that has the $-methods to set on the $resource result
 */
function resourceResult(result, mock) {
  angular.forEach(mock, function (fn, fnName) {
    if (fnName[0] === '$') {
      result[fnName] = fn;
    }
  });

  return {
    $promise: mock ? resourcePromise(result) : promise(result)
  };
}

function nonResolvingResourceResult() {
  return {
    $promise: unresolvedPromise()
  };
}

function rejectingResourceResult(errorMessage) {
  return {
    $promise: reject(errorMessage)
  };
}

/********************************
 * Util functions for viewspecs *
 ********************************/

// based on protractor's findBindings / by.binding selector
// https://github.com/angular/protractor/blob/master/lib/clientsidescripts.js#L44
// 'extends' the given jquery element with a findBinding method to locate an element by its
// angularjs binding. Avoids having to add IDs or classes to elements to make them findable
// in view specs. Returns a jquery-wrapped (list of) items.
function extendElement(element) {
  element.findBinding = function (binding) {
    var bindings = element.find('.ng-binding');
    var matches = [];
    angular.forEach(bindings, function (bindingElem){
      var dataBinding = angular.element(bindingElem).data('$binding');
      if (dataBinding) {
        var bindingName = dataBinding.exp || dataBinding[0].exp || dataBinding;
        if (bindingName.indexOf(binding) !== -1) {
          matches.push(bindings[i]);
        }
      }
    });
    return $(matches);
  };
  return element;
}

/*
 * Extends an angular DOM element with attributes that are found on the element.
 *
 * e.g.
 * <div class="container">
 *   <h1>The container</h1>
 *   <p class="sub">with a subtitle</p>
 * </div>
 *
 * var element = extendedElement(rootElement.find('.container'), {title: 'h1', subtitle: 'p.sub'});
 * element.title.text() // The container
 */
function extendedElement(e, extensions) {
  var exts = {};
  angular.forEach(extensions, function (value, key) {
    exts[key] = e.find(value);
  });
  return angular.extend(e, exts);
}

/**
 * Extends an angular DOM element with attributes that are their children
 *
 * e.g.
 * <table><thead><tr>
 *   <th>Your name</th><th> Your age</th>
 * </tr></thead></table>
 *
 * var element = extendedElementWithChildren(rootElement.find('table thead tr'), ['name','age']);
 * element.name.text() // Your name
 */
function extendedElementWithChildren(e, keys) {
  var children = [];
  angular.forEach(e.children(), function (child) {
    children.push(angular.element(child));
  });

  var pairs = {};
  angular.forEach(children, function (value, i) {
    pairs[keys[i]] = value;
  });
  return angular.extend(e, pairs);
}

/**
 * Constructor function for testing $resource or an restangularized object
 *
 * Usage:
 * requestTest()
 *   .whenMethod(fooResource.query)
 *   .expectGet('api/foo')
 *   .andRespond([])
 *   .run();
 */
function requestTest() {

  var test = {
    _httpMethod: 'GET',
    _data: null
  };

  test._expectedResult = test._response;

  test.whenPath = function whenPath(path) {
    test._path = path;
    return test;
  };

  test.whenMethod = function whenMethod(method) {
    test._method = method;
    test._methodArguments = Array.prototype.slice.call(arguments, 1);
    return test;
  };

  test.whenCall = test.whenMethod;

  test.whenHttpMethod = function whenHttpMethod(httpMethod) {
    test._httpMethod = httpMethod;
    return test;
  };

  test.whenData = function whenData(data) {
    test._data = data;
    return test;
  };

  test.expectRequest = function expectRequest(httpMethod, path, data) {
    test.whenHttpMethod(httpMethod);
    test.whenPath(path);
    test.whenData(data);
    return test;
  };

  test.andRespond = function andRespond(response) {
    test._response = response;
    test._expectedResult = test._response;
    return test;
  };

  test.andExpect = function andExpect(expectedResult) {
    test._expectedResult = expectedResult;
    return test;
  };

  test.expectGet = function expectGet(path) {
    return test.expectRequest('GET', path);
  };

  test.expectPost = function expectPost(path, data) {
    return test.expectRequest('POST', path, data);
  };

  test.expectPut = function expectPut(path, data) {
    return test.expectRequest('PUT', path, data);
  };

  test.expectDelete = function expectDelete(path, data) {
    return test.expectRequest('DELETE', path, data);
  };

  test.expectQueryParams = function expectQueryParams(expectedQueryParams) {
    test._expectedQueryParams = expectedQueryParams;
    return test;
  };

  function validateUrl(url) {
    if (test._expectedQueryParams) {
      expect(url).toHaveQueryParams(test._expectedQueryParams);
      return test._path ? url.indexOf(test._path) >= 0 : true;
    }
    return test._path === url;
  }

  test.fail = function fail() {
    test._expectFail = true;
    test.run();
  };

  test.run = function run() {
    test._response = test._response || {};
    injectEnv('$httpBackend').expect(test._httpMethod, {test: validateUrl}, test._data).respond(test._response);

    var response = test._method.apply(this, test._methodArguments);
    var isResourceResult = !!response.$promise;
    var promise = response.$promise || response;

    promise
      .then(jasmine.successCallback)
      .except(jasmine.failureCallback);

    injectEnv('$httpBackend').flush();

    if (test._expectFail) {
      expect(jasmine.failureCallback).toHaveBeenCalled();
    }

    var callback = test._expectFail ? jasmine.failureCallback : jasmine.successCallback;
    if (angular.isFunction(test._expectedResult)) {
      test._expectedResult(callback.mostRecentCall.args[0]);
    } else {
      if (isResourceResult) {
        expect(callback).toHaveBeenCalled();
      } else {
        expect(callback).toHaveBeenCalledWithRestangularized(test._expectedResult || {});
      }
    }

    injectEnv('$httpBackend').verifyNoOutstandingExpectation();
  };

  return test;
}
