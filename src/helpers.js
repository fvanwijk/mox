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
 * Injects a service.
 * If the injector is not yet initialized, it will be initialized. This has as side effect that the module config
 * functions are called.
 *
 * @param {string} name of the inject to get
 * @returns service
 */
function injectEnv(name) {
  if (!currentSpec.$injector) {
    throw Error('Sorry, cannot inject ' + name + ' because the injector is not ready yet. Please call mox.run() or inject()');
  }
  return currentSpec.$injector.get(name);
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
  var $scope = injectEnv('$rootScope').$new();
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
  return injectEnv('$controller')(ctrlName, angular.extend({ $scope: $scope || currentSpec.$scope }, locals || {}));
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
 * @param {boolean} appendToBody is true when the compiled html should be added to the DOM.
 *        Set mox.testTemplatePath to add a tempate to the body and append the html to the element with selector mox.testTemplateAppendSelector
 * @returns the created element
 */
function compileHtml(html, $scope, appendToBody) {
  $scope = $scope || currentSpec.$scope;
  if (appendToBody === undefined) { appendToBody = true; }

  var element = injectEnv('$compile')(html)($scope);
  if (appendToBody) {
    if (mox.testTemplatePath && mox.testTemplateAppendSelector) {
      jasmine.getFixtures().load(mox.testTemplatePath);
      angular.element(document.body).find(mox.testTemplateAppendSelector).append(element);
    } else {
      jasmine.getFixtures().set(element);
    }
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
  var html = injectEnv('$templateCache').get(template);
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
 *
 * @deprecated
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

  function setPropertyIfUndefined(obj, prop, value) {
    if (!angular.isDefined(obj[prop])) {
      obj[prop] = value;
    }
  }
  function addChildFn(element, children) {
    angular.forEach(children, function (child, idx) {
      var name = angular.isObject(child) ? child.name : child,
        sub = child.sub;

      setPropertyIfUndefined(element, name, function () {
        var childElement = element.children().eq(idx);
        addSelectors(childElement, sub);
        return childElement;
      });
    });
  }

  function findElement(element, selector, args) {
    if (selector) {
      var replacedSelector = selector.replace(/{(\d+)}/g, function (match, group) {
        return args[group];
      });
      return element.find(replacedSelector);
    }
    return element.clone();
  }

  angular.forEach(selectors, function (value, key) {
    var selector = angular.isObject(value) ? value.selector : value,
      sub = value.sub,
      children = value.children;

    setPropertyIfUndefined(element, key, function () {
      var foundElement = findElement(element, selector, arguments);
      addSelectors(foundElement, sub);
      addChildFn(foundElement, children);
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
    injectEnv('$httpBackend').expect(test._httpMethod, { test: validateUrl }, test._data).respond(test._response);

    var response = test._method.apply(this, test._methodArguments);
    var promise = response.$promise || response;

    if (angular.isFunction(test._expectedResult)) {
      var successCallback = jasmine.createSpy('success callback');
      var failureCallback = jasmine.createSpy('failure callback');

      promise
        .then(successCallback)
        .catch(failureCallback);

      injectEnv('$httpBackend').flush();

      test._expectedResult((test._expectFail ? failureCallback : successCallback).mostRecentCall.args[0]);
    } else {
      injectEnv('$httpBackend').flush();

      if (test._expectFail) {
        expect(promise).toReject();
      } else {
        expect(promise).toResolve();
      }
    }

  };

  return test;
}
