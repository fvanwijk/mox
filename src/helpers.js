/*******************************
 * Helper functions *
 *******************************/

import {mox} from './mox';

export var helpers = {
  copy,
  inject: syncInject,
  createScope,
  createController,
  compileHtml,
  compileTemplate,
  unresolvedPromise,
  promise,
  resourcePromise,
  reject,
  resourceResult,
  nonResolvingResourceResult,
  rejectingResourceResult,
  addSelectors,
  requestTest
};

//function beforeEach() {}
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
 * Injects one or multiple services and returns them
 *
 * @param {string} name of the inject to get
 * @returns {Object}
 */
function syncInject(name) {
  if (!currentSpec.$injector) {
    throw Error('Sorry, cannot inject ' + name + ' because the injector is not ready yet. Please load a module and call mox.run() or mox.helpers.inject()');
  }
  var args = Array.prototype.slice.call(arguments, 0);
  var injects = {};
  angular.forEach(args, function (injectName) {
    injects[injectName] = currentSpec.$injector.get(injectName);
  });
  return args.length === 1 ? injects[name] : injects;
}

/**
 * Create a new scope that is a child of $rootScope.
 *
 * @param {Object} [params] optional variables to bind to the $scope
 * @returns {Object}
 */
function createScope(params) {
  var $scope = syncInject('$rootScope').$new();
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
  return syncInject('$controller')(ctrlName, angular.extend({ $scope: $scope || currentSpec.$scope }, locals || {}));
}

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

  var element = syncInject('$compile')(html)($scope);
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
  var html = syncInject('$templateCache').get(template);
  return this.compileHtml('<div>' + html + '</div>', $scope, appendToBody);
}

/*********************
 * Promise shortcuts *
 *********************/

function unresolvedPromise() {
  return syncInject('$q').defer().promise;
}

function promise(result, dontCopy) {
  return syncInject('$q').when(dontCopy ? result : copy(result));
}

/**
 * A resolved $resource promise must contain $-methods, so JSON-copy is not possible
 */
function resourcePromise(result) {
  return syncInject('$q').when(angular.copy(result));
}

function reject(error) {
  return syncInject('$q').reject(error);
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
      var name = angular.isObject(child) ? child.name : child;

      checkAndSetFn(element, name, function moxExtendElement() {
        var childElement = element.children().eq(idx);
        addSelectors(childElement, child.sub);
        addChildFn(childElement, child.children);
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
    syncInject('$httpBackend').expect(test._httpMethod, { test: validateUrl }, test._data).respond(test._response);

    var response = test._method.apply(this, test._methodArguments);
    var promise = response.$promise || response;

    if (angular.isFunction(test._expectedResult)) {
      var successCallback = jasmine.createSpy('success callback');
      var failureCallback = jasmine.createSpy('failure callback');

      promise
        .then(successCallback)
        .catch(failureCallback);

      syncInject('$httpBackend').flush();

      var cb = test._expectFail ? failureCallback : successCallback;
      if (currentSpec.isJasmine2) {
        test._expectedResult(cb.calls.mostRecent().args[0]);
      } else {
        test._expectedResult(cb.mostRecentCall.args[0]);
      }
    } else {
      syncInject('$httpBackend').flush();

      if (test._expectFail) {
        expect(promise).toReject();
      } else {
        expect(promise).toResolve();
      }
    }

  };

  return test;
}
