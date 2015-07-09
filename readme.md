# Mox: Mocking utility library for AngularJS apps

[![Build Status](https://travis-ci.org/fvanwijk/mox.svg?branch=master)](https://travis-ci.org/fvanwijk/mox)
[![Test Coverage](https://codeclimate.com/github/fvanwijk/mox/badges/coverage.svg)](https://codeclimate.com/github/fvanwijk/mox)
[![Code Climate](https://codeclimate.com/github/fvanwijk/mox/badges/gpa.svg)](https://codeclimate.com/github/fvanwijk/mox)

When it comes to unit tests, normally a lot of boilerplate code is written to set up the mocks. This library consists of
some utility functions to set up mocks very fast and have total control of the scope of your tests.

## Usage
Copy moxConfig.js to your project test folder. Put mox.js and moxConfig.js in your karma.conf.js file list, is this order:

```javascript
files: [
...
  'bower_components/jasmine-mox-matchers/src/jasmine-mox-matchers.js' // or dist/jasmine-mox-matchers.min.js
  'bower_components/mox/dist/mox.js', // Or mox.min.js
  'test/moxConfig.js',
...
],
```

## Full usage example

```javascript
describe('Example of Mox', function () {

  beforeEach(function() {

    mox
      .module(
        'myApp',
        function ($provide) {
          // Custom module config function
          $provide.constant('yolo', 'swag');
        }
      )
      .mockServices(
        'FooService',
        'barFilter'
      )
      .mockConstants({
        fooConstant: value
      })
      .mockDirectives(
        'bazDirective',
        {
          name: 'yoloDirective',
          template: '<div>Custom directive template</div>',
          link: function customLinkFn() { }
        }
      )
      .disableDirectives(
        'fooDirective'
      )
      .setupResults({
        fooService: {
          getBars: ['barData1', 'barData2'],
          getTranslation: function (key) {
            return key == 'fooTitle' ? 'mock title';
          }
        },
        barFilter: 'mock filter result' // Object not allowed as return value
      })
      .mockTemplates(
        'scripts/views/template1.html',
        'scripts/views/template2.html',
      )
      .mockControllers('ChildController')
      .run();

    createScope();
    createController('FootController');

    it('should do something', inject(function (FooService) {

      expect(this.$scope.foo).toBe('bar');
      expect(FooService).toBe(mox.get.FooService);
      expect(FooService.getBars()).toEqual(['barData1', 'barData2']);

      var translation = FooService.getTranslation('fooTitle');

      expect(FooService.getTranslation).toHaveBeenCalledWith('fooTitle');
      expect(translation).toBe('mockTitle');

    });

  });

});
```

## Mox registration methods

### mox.inject()

Inject services directly using `inject('<service>')`, for example:

```javascript
var fooService = inject('FooService');
fooService.doSomething();
var services = inject('FooService', 'BarService'); // { FooService: ..., BarService: ... }
services.FooService.doSomething();
```

This can be used instead of using a inject wrapper such as `inject(function(FooService) { })`.
The `mox.inject` function can also be used to get mocked services but it is prefered to use `mox.get.FooService`.



### mox.module()

Sets up the module, just like [module()](https://docs.angularjs.org/api/ngMock/function/angular.mock.module) does.
Pass module names, config functions or objects. The passed arguments are executed when `run()` is called.

Returns the Mox instance to make chaining possible.

```javascript
mox.module('foo', function ($provide) {
  $provide.constant('foo', 'bar');
})
```

### mox.mockServices()

Registers services to be mocked. This can be an Angular factory, service and/or filter. The mocked service will be a spy
object with spies for every method in the original service, unless there is a factory function defined in the moxConfig.js file.
This function tries create a resource mock or normal mock depending on the mock name prefix (`Filter` or `Resource`).
The following mocks are created:

* when mock factory exists in `moxConfig.js`: jasmine spy object with spy methods as defined in mock (factory function is executed)
* when name ends with `Filter`: jasmine spy
* when name ends with `Resource`: jasmine spy object with spy methods `get`, `query`, `save`, `remove`, `delete`,
  `$get`, `$query`, `$save`, `$remove`, `$delete`
* otherwise a jasmine spy object with spy methods from the original service

One service:

```javascript
mox.mockServices('FooResource')
```

Multiple services:

```javascript
mox.mockServices(
   'fooResource',
   'barService'
)
```

Returns the Mox instance to make chaining possible.

### mox.mockConstants()

Register constants to be mocked and define their value. These mocks can be injected in a config function immediately.
Pass a name and value as parameters for one constant, or an object with definitions for multiple constants.

One constant:

```javascript
mox.mockConstant('FooConstant', 'value')
```

Multiple constants:

```javascript
mox.mockConstant({
  FooConstant: value,
  BarConstant: anotherValue
})
```

### mox.mockDirectives()

Register directive(s) to be mocked. The mock will be an empty directive with the same isolate scope as the original directive,
so the isolate scope of the directive can be tested:

```javascript
compiledElement.find('[directive-name]').toContainIsolateScope({ key: value });
```

Accepts 3 types of input:
1. a directive name: the same as with an array, but just for one directive
2. a directive factory object, for your own mock implementation.
  - name property is required
  - scope, priority and restrict properties are not overwritable
3. an array of directive names (see 1) or objects (see 2)

Returns the Mox instance to make chaining possible.

### mox.disableDirectives()

"Disables" the given list of directives, not just mocking them.
Accepts directive name or array with directive names to disable.

Returns the Mox instance to make chaining possible.

### mox.mockControllers()

Registers controllers to be mocked. This is useful for view specs where the template contains an `ng-controller`.
The view's `$scope` is not set by the controller anymore, but you have to set the `$scope` manually.

```javascript
mox.mockControllers('FooController')
```

Returns the Mox instance to make chaining possible.

### mox.run()

Executes all registered stuff so that the actual mocking is done. If you forget to call `run()`, nothing will be mocked.
The real services will be overwritten by mocks via `$provide.value`, so when you inject `FooService`, you get the mocked service, including
spies on all methods.

As bonus, the mocks are added to the `mox.get` object, so that you can access mocks easily in your specs without having to inject them.

Returns the result of angular.mocks.module`, so that the call can passed as argument to `beforeEach`. So chaining is not possible after `run()`.

```javascript
beforeEach(mox.module('myApp').run());
```

## Mox configuration methods

### mox.setupResults()

Pass an object with a configuration for the spy functions of the already registered mocks.
If the value is a function, it will be set using Jasmine's `andCallFake()`, otherwise it uses `andReturn`

```javascript
mox.setupResults({
  fooService: {
    getBars: ['barData1', 'barData2'],
    getTranslation: function (key) {
      return key == 'fooTitle' ? 'mock title' : 'mock other string';
    }
  },
  barFilter: 'mock filter result' // Object not allowed as return value
});
```

### mox.mockTemplates()

Replaces templates with a mock template: `<div>This is a mock for views/templatename.html</div>` or a custom template.
This is very useful when you want to mock an `ng-include` in your view spec. The mocked templates will be tested in a
separate view spec.

Note that this method is not called in the chain that ends with `run()`. This is because `mockTemplates` needs the injector
to already be initialized, which is done after calling `run()`.

```javascript
mox.mockTemplates(
  'scripts/views/templatename.html',
  { 'scripts/views/anotherTemplate.html': '<tr><td></td></tr>' }
)
```

Or just one template:

```javascript
mox.mockTemplates('scripts/views/templatename.html');
```

Or:

```javascript
mox.mockTemplate({ 'scripts/views/anotherTemplate.html': '<tr><td></td></tr>' });
```

## Static methods/properties

### mox.save()

Registers a mock and save it to the cache.
This method usually is used when defining a custom mock factory function or when manually creating a mock.

```javascript
mox.save($provide, 'FooService', fooServiceMock);
```

Returns the saved mock.

### mox.get

When a mock is registered, you can get the mock without injecting it.

```javascript
var fooService = mox.get.FooService;
```

### mox.factories

Call a mock factory function manually without chaining via `mox`.
The factory functions needs to be defined in moxConfig.

```javascript
mox.factories.FooServices($provide);
```

## Testing a $resource

Setting up a resource test normally involves a lot of boilerplate code, like injecting $httpBackend, flushing, etc.
With Mox you can test a resource in 5 lines of code or less.

```javascript
requestTest()
  .whenMethod(FooResource.query, { bar: baz })
  .expectGet('api/foo?bar=baz')
  .andRespond([])
  .run();
```

When you test a resource that returns an object, such as `get()`, `andRespond({})` is not necessary, since
`requestTest()` responds with `{}` by default.

## Utility functions

Finally this framework contains a lot of utility functions:

* Functions to prevent injecting common stuff like `$q`, `$controller`, `$compile` and `$rootScope` in the spec
* Functions for quick promise and resource result mocking
* Function to prevent writing duplicated selectors (addSelectors)

### Generic shortcuts for specs

* `createScope`: Creates a new $rootScope child. The optional passed argument is an object. Also sets the created scope on the current spec.
* `createController(controllerName)`: Creates and initialized a controller.
* `getMockData(fileName)`: Asynchronously loads the contents of a JSON file. The argument is a path without '.json'.

### Compile shortcuts

* `compileTemplate(path, $scope)`: Returns a compiled and linked template and digest the $scope.
* `compileHtml(html, $scope)`: Returns compiled and linked HTML and digest the $scope. Useful for directives.

The compiled element is appended to the document body and is removed in between each spec.
When you set `mox.testTemplatePath`, a the specified template is appended to the body first and the compiled element is
appended to the element which can be found using the CSS selector in `mox.testTemplateAppendSelector`.

When no scope is provided, it tries to use `this.$scope` which is set by `createScope()`.
The compiled element is set on the current spec.

### Promise shortcuts

* `defer`, `when`, `all`: shortcuts for `$q.defer`, `$q.when` and `$q.all`.
* `unresolvedPromise`: returns `$q.defer().promise` without resolving it.
* `promise(result, dontCopy)`: returns a promise that resolves to `result`. When `dontCopy` is false, the result object
will be copied before resolving.
* `resourcePromise(result)`: returns a promise that resolves to `result`. The result is 'deep' copied using
`angular.copy` so that functions on the result are not lost during copying.
* `restangularPromise`: returns a promise using `$q.when`
* `reject(message)`: returns a rejecting promise.
* `resourceResult(result, mock)`: returns a resource result with a resolving promise - `{ $promise: resultPromise }`.
If you provide a mock, the functions of this mock are copied to the result as $-methods.
* `rejectingResourceResult` and `nonResolvingResourceResult` return resource results with rejecting or empty promises.

### addSelectors

Adds helper functions to an element that simplify element selections.
The selection is only performed when the generated helper functions are called, so these work properly with changing DOM elements.

Example template:

```html
<div>
  <div id="header"></div>
  <div id="body">
    <div class="foo">Foo</div>
    <div data-test="bar">
      Bar <span class="hl">something</span>
    </div>
    <div id="num-1-1">Test 1</div>
    <div id="num-2-1">Test 2</div>
    <div id="num-2-2">Test 3</div>
    <table>
      <tbody>
        <tr>
          <td>Alice</td>
          <td>54</td>
          <td>Blue</td>
        </tr>
        <tr>
          <td>Bob</td>
          <td>54</td>
          <td>Grey</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div id="footer">
    <h3>Footer <span>title</span></h3>
    <div>Footer <span>content</span></div>
  </div>
</div>
```

Test initialisation:

```html
var element = compileHtml(template);
addSelectors(element, {
  header: '[id="header"]',               // shorthand string notation
  body: {                                // full object notation
    selector: '#body',                   // element selector
    sub: {                               // descendant selectors
      foo: '.foo',
      bar: {
        selector: '[data-test="bar"]',
        sub: {
          highlight: '.hl'
        }
      },
      num: '[id="num-{0}-{1}"]'          // parameter placeholders can be used
    }
  },
  resultsRows: {
    repeater: 'tbody > tr',
    children: ['name', 'age', 'eyeColor']
  },
  footer: {
    selector: '#footer',
    children: [                          // shorthand for child nodes, starting from first node
      'heading',                         // shorthand string notation
      {                                  // full object notation
        name: 'content',
        sub: {
          innerSpan: 'span'
        }
      }
    ],
    sub: {                               // sub and children can be mixed
      spans: 'span'                      // (as long as they don't overlap)
    }
  }
});
```

Test code (Jasmine-style):

```javascript
expect(element.header()).toExist();

expect(element.body()).toExist();
expect(element.body().foo()).toExist();
expect(element.body().bar()).toExist();
expect(element.body().bar().highlight()).toExist();
expect(element.body().num(1, 1)).toExist();
expect(element.body().num(2, 1)).toExist();
expect(element.body().num(2, 2)).toExist();

expect(element.resultRows()).toHaveLength(2);
expect(element.resultRows(0).name()).toExist();
expect(element.resultRows(0).age()).toExist();
expect(element.resultRows(0).eyeColor()).toExist();

expect(element.footer()).toExist();
expect(element.footer().heading()).toExist();
expect(element.footer().content()).toExist();
expect(element.footer().content().innerSpan()).toExist();
expect(element.footer().spans()).toHaveLength(2);
```

## Contributors

* [@fvanwijk](https://github.com/fvanwijk)
* [@AlbertBrand](https://github.com/AlbertBrand)
* [@mikewoudenberg](https://github.com/mikewoudenberg)
* [@fwielstra](https://github.com/fwielstra)
* [@jbnicolai](https://github.com/jbnicolai)
