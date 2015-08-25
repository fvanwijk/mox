/*******************************
 * Helper functions *
 *******************************/

// Save the current spec for later use (Jasmine 2 compatibility)
var currentSpec;
beforeEach(function () {
  this.isJasmine2 = /^2/.test(jasmine.version);
  currentSpec = this;
});

/*
 * angular-mocks v1.2.x clears the cache after every spec. We do not want this when we compile a template once in a beforeAll
 */
if (typeof beforeAll !== 'undefined')  {
  angular.mock.clearDataCache = angular.noop;
}

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
  var $scope = mox.inject('$rootScope').$new();
  if (params) {
    angular.extend($scope, params);
  }
  currentSpec.$scope = $scope;
  return $scope;
}

/**
 * Creates a controller and runs the controller function.
 *
 * @param {string} ctrlName controller to create
 * @param {Object} $scope to inject into the created controller. If not given, look if there is a scope created with createScope().
 * @param {Object} [locals] optional local injections
 * @returns {*}
 */
function createController(ctrlName, $scope, locals) {
  return mox.inject('$controller')(ctrlName, angular.extend({ $scope: $scope || currentSpec.$scope }, locals || {}));
}

/**
 * Mock the current date.
 * Specs that use Date depend on the current date
 * will introduce unreliable behaviour when the current date is not mocked.
 * @param {string} dateString
 *
 * @deprecated This function requires too much external dependencies.
 * Jasmine 2.x can mock the date with jasmine.clock().mockDate(new Date(dateString))
 */
function mockDate(dateString) {
  var clock;

  beforeEach(function () {
    clock = sinon.useFakeTimers(+new Date(dateString));
  });

  afterEach(function () {
    clock.restore();
  });
}

/**
 * Depends on jasmine-jquery
 * @param {String} path
 * @returns {*}
 */
function getMockData(path) {
  return copy(getJSONFixture(path));
}

/**
 * @deprecated Use angular.noop() instead
 */
function noop() {}

/*********************
 * Compile shortcuts *
 *********************/

/**
 * Compile HTML and digest the scope (for example a directive).
 *
 * Example:
 * compileHtml('<p>This is a test</p>', $scope, true);
 *
 * Html added to body:
 *
 * ```
 * <div id="jasmine-fixtures"><p>This is a test</p></div>
 * ```
 *
 * Html added to body when mox.testTemplateAppendSelector = '#container' and mox.testTemplatePath = 'container.html'.
 * Contents of container.html: <div id="#container"><h1>This is a container</h1></div>
 *
 * ```
 * <div id="jasmine-fixtures"><div id="#container"><h1>This is a container</h1><p>This is a test</p></div></div>
 * ```
 *
 * @param {string} html
 * @param {Object} $scope to bind to the element. If not given, look if there is a scope created with createScope().
 * @param {boolean} [appendToBody] is true when the compiled html should be added to the DOM.
 *        Set mox.testTemplatePath to add a template to the body and append the html to the element with selector mox.testTemplateAppendSelector
 * @returns the created element
 */
function compileHtml(html, $scope, appendToBody) {
  $scope = $scope || currentSpec.$scope;
  if (appendToBody === undefined) { appendToBody = true; }

  var element = mox.inject('$compile')(html)($scope);
  var body = angular.element(document.body);
  body.find(mox.testTemplateAppendSelector).remove();
  if (appendToBody) {
    var testTemplate = mox.testTemplatePath ? jasmine.getFixtures().read(mox.testTemplatePath) : angular.element('<div id="mox-container">');
    body.append(testTemplate).find(mox.testTemplateAppendSelector).append(element);
  }

  currentSpec.element = element;
  $scope.$digest();
  return currentSpec.element;
}

/**
 * Compile a template and digest the $scope.
 * When the html will not be added to the body, the html is wrapped in a div.
 *
 * @param {string} template name
 * @param {Object} $scope to bind to the template
 * @returns the created element
 */
function compileTemplate(template, $scope, appendToBody) {
  var html = mox.inject('$templateCache').get(template);
  return compileHtml('<div>' + html + '</div>', $scope, appendToBody);
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
 *
 * @deprecated We want all elements to be appended to document body via default via compileHtml
 */
function compileHtmlOnDom(html, $scope) {
  var element = compileHtml(html, $scope);
  var body = mox.inject('$document').find('body');

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
 *
 * @deprecated
 */
function removeCompiledHtmlFromDom() {
  return mox.inject('$document').find('body').find('#test-input-container').remove();
}

/*********************
 * Promise shortcuts *
 *********************/

function defer() {
  return mox.inject('$q').defer();
}

function when() {
  /* jshint -W040 */
  return mox.inject('$q').when.apply(this, arguments);
}

function all() {
  return mox.inject('$q').all.apply(this, arguments);
}

function unresolvedPromise() {
  return defer().promise;
}

function promise(result, dontCopy) {
  var deferred = defer();
  deferred.resolve(dontCopy ? result : copy(result));
  return deferred.promise;
}

/**
 * @deprecated use resourcePromise, which does the same
 */
function restangularPromise(result) {
  return mox.inject('$q').when(angular.copy(result));
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
  return mox.inject('$q').reject(error);
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

/**
 * based on protractor's findBindings / by.binding selector
 * https://github.com/angular/protractor/blob/master/lib/clientsidescripts.js#L44
 * 'extends' the given jquery element with a findBinding method to locate an element by its
 * angularjs binding. Avoids having to add IDs or classes to elements to make them findable
 * in view specs. Returns a jquery-wrapped (list of) items.
 *
 * @deprecated This method is barely used and it is easier to find a suitable CSS selector
 */
function extendElement(element) {
  element.findBinding = function (binding) {
    var bindings = element.find('.ng-binding');
    var matches = [];
    angular.forEach(bindings, function (bindingElem) {
      var dataBinding = angular.element(bindingElem).data('$binding');
      if (dataBinding) {
        var bindingName = dataBinding.exp || dataBinding[0].exp || dataBinding;
        if (bindingName.indexOf(binding) !== -1) {
          matches.push(bindingElem);
        }
      }
    });
    return angular.element(matches);
  };
  return element;
}

/**
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
 *
 * @deprecated use addSelectors
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
 *
 * @deprecated use addSelectors
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
 * Adds helper functions to an element that simplify element selections.
 * The selection is only performed when the generated helper functions are called, so
 * these work properly with changing DOM elements.
 *
 * Template example:
 *
 * <div>
 *   <div id="header"></div>
 *   <div id="body">
 *     <div class="foo">Foo</div>
 *     <div data-test="bar">
 *       Bar <span class="hl">something</span>
 *     </div>
 *     <div id="num-1-1">Test 1</div>
 *     <div id="num-2-1">Test 2</div>
 *     <div id="num-2-2">Test 3</div>
 *   </div>
 *   <div id="footer">
 *     <h3>Footer <span>title</span></h3>
 *     <div>Footer <span>content</span></div>
 *   </div>
 * </div>
 *
 *
 * Initialisation example:
 *
 * var element = compileHtml(template);
 * addSelectors(element, {
 *   header: '[id="header"]',               // shorthand string notation
 *   body: {                                // full object notation
 *     selector: '#body',                   // element selector
 *     sub: {                               // descendant selectors
 *       foo: '.foo',
 *       bar: {
 *         selector: '[data-test="bar"]',
 *         sub: {
 *           highlight: '.hl'
 *         }
 *       },
 *       num: '[id="num-{0}-{1}"]'          // parameter placeholders can be used
 *     }
 *   },
 *   footer: {
 *     selector: '#footer',
 *     children: [                          // shorthand for child nodes, starting from first node
 *       'heading',                         // shorthand string notation
 *       {                                  // full object notation
 *         name: 'content',
 *         sub: {
 *           innerSpan: 'span'
 *         }
 *       }
 *     ],
 *     sub: {                               // sub and children can be mixed
 *       spans: 'span'                      // (as long as they don't overlap)
 *     }
 *   }
 * });
 *
 *
 * Test examples:
 *
 * expect(element.header()).toExist();
 *
 * expect(element.body()).toExist();
 * expect(element.body().foo()).toExist();
 * expect(element.body().bar()).toExist();
 * expect(element.body().bar().highlight()).toExist();
 * expect(element.body().num(1, 1)).toExist();
 * expect(element.body().num(2, 1)).toExist();
 * expect(element.body().num(2, 2)).toExist();
 *
 * expect(element.footer()).toExist();
 * expect(element.footer().heading()).toExist();
 * expect(element.footer().content()).toExist();
 * expect(element.footer().content().innerSpan()).toExist();
 * expect(element.footer().spans()).toHaveLength(2);
 *
 *
 * @param {Object} element
 * @param {Object} selectors
 * @returns {Object} element
 */
function addSelectors(element, selectors) {

  function checkAndSetFn(obj, prop, fn) {
    var property = obj[prop];
    if (angular.isUndefined(property)) {
      obj[prop] = fn;
    } else if (!(angular.isFunction(property) && property.name === 'moxExtendElement')) {
      throw Error('Property ' + prop + ' already defined on element');
    }
  }

  function addChildFn(element, children) {
    angular.forEach(children, function (child, idx) {
      var name = angular.isObject(child) ? child.name : child,
        sub = child.sub;

      checkAndSetFn(element, name, function moxExtendElement() {
        var childElement = element.children().eq(idx);
        addSelectors(childElement, sub);
        return childElement;
      });
    });
  }

  function findElement(element, value, args) {
    if (value) {
      if (angular.isString(value) || value.selector) {
        var replacedSelector = (value.selector || value).replace(/{(\d+)}/g, function (match, group) {
          return args[group];
        });
        return element.find(replacedSelector);
      } else if (value.repeater) {
        var elements = element.find(value.repeater);
        return angular.isDefined(args[0]) ? elements.eq(args[0]) : elements;
      }
    }
    return angular.element(element);
  }

  angular.forEach(selectors, function (value, key) {
    var
      children = value.children,
      sub = value.sub;

    checkAndSetFn(element, key, function moxExtendElement() {
      var foundElement = findElement(element, value, arguments);
      if (!value.repeater || angular.isDefined(arguments[0])) {
        addSelectors(foundElement, sub);
        addChildFn(foundElement, children);
      }
      return foundElement;
    });
  });

  return element;
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

  var self = this;
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
    mox.inject('$httpBackend').expect(test._httpMethod, { test: validateUrl }, test._data).respond(test._response);

    var response = test._method.apply(this, test._methodArguments);
    var promise = response.$promise || response;

    if (angular.isFunction(test._expectedResult)) {
      var successCallback = jasmine.createSpy('success callback');
      var failureCallback = jasmine.createSpy('failure callback');

      promise
        .then(successCallback)
        .catch(failureCallback);

      mox.inject('$httpBackend').flush();

      var cb = test._expectFail ? failureCallback : successCallback;
      if (self.isJasmine2) {
        test._expectedResult(cb.calls.mostRecent().args[0]);
      } else {
        test._expectedResult(cb.mostRecentCall.args[0]);
      }
    } else {
      mox.inject('$httpBackend').flush();

      if (test._expectFail) {
        expect(promise).toReject();
      } else {
        expect(promise).toResolve();
      }
    }

  };

  return test;
}

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
      if (angular.isFunction(obj) && obj.name !== 'Resource') {
        return;
      }
      var methodNames = [];

      // TODO: recursively replace nested methods with nested spies
      angular.forEach(obj, function (method, methodName) {
        if (angular.isFunction(method)) {
          methodNames.push(methodName);
        }
      });
      return methodNames;
    }

    assertDeprecatedArguments(arguments);

    var mockNames = arguments;

    moduleFns.push(function mockServicesFn($provide) {
      var injector = angular.injector(['ng', 'ngMock'].concat(moduleNames));

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
          var service = injector.get(mockName);
          if (service.name === 'Resource') {
            mox.createResourceMock(mockName, getMethodNames(service))($provide);
          } else {
            var methodNames = angular.isObject(service) || angular.isFunction(service) ? getMethodNames(service) : undefined;
            mox.createMock(mockName, methodNames)($provide);
          }
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
        var mock;
        if (mockName in mox.get) {
          mock = mox.get[mockName];
        } else {
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
    allMethods.constructor = 'constructor';
    return function ($provide) {
      var mock = jasmine.createSpyObj(mockName, Object.keys(allMethods));

      // Create a mocked constructor that returns the mock itself plus the data that is provided as argument
      var fn = function (data) {
        return angular.extend({}, mock, data);
      };
      if (currentSpec.isJasmine2) {
        mock.constructor.and.callFake(fn);
      } else {
        mock.constructor.andCallFake(fn);
      }

      angular.extend(mock.constructor, mock);

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
