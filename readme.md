# Mox: Mocking utility library for AngularJS apps

When it comes to unit tests, normally a lot of boilerplate code is written to set up the mocks. This library consists of
some utility functions to set up mocks very fast and have total control of the scope of your tests.

NB: Sorry, no full Jasmine 2 support yet!

## Usage
Copy moxConfig.js to your project test folder. Put mox.js and moxConfig.js in your karma.conf.js file list, is this order:

    files: [
    ...
      'bower_components/jasmine-mox-matchers/src/jasmine-mox-matchers-1.x.js' // or 2.x if you are using Jasmine 2
      'bower_components/mox/mox.js',
      'test/moxConfig.js',
    ...
    ],
    
## Full usage example

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
          .mockDirectives([
            'bazDirective',
            {
              name: 'yoloDirective',
              priority: 0,
              restrict: 'EAC',
              scope: { firstScopeVar: '=', secondScopeVar: '@' }
              template: '<div>Custom directive template</div>'
            }
          ])
          .disableDirectives([
            'fooDirective'
          ])
          .setupResults({
            fooService: {
              getBars: ['barData1', 'barData2'],
              getTranslation: function (key) {
                return key == 'fooTitle' ? 'mock title';
              }
            },
            barFilter: 'mock filter result' // Object not allowed as return value
          })
          .mockTemplates([
            'scripts/views/template1.html',
            'scripts/views/template2.html',
          ])
          .run();
        
        it('should do something', inject(function (FooService) {
          
          expect(FooService).toBe(mox.get.FooService);
          expect(FooService.getBars()).toEqual(['barData1', 'barData2']);
          
          var translation = FooService.getTranslation('fooTitle');
          
          expect(FooService.getTranslation).toHaveBeenCalledWith('fooTitle');
          expect(translation).toBe('mockTitle');
          
        });
        
      });
    
    });
      
## Mox registration methods

### mox.module()

Sets up the module, just like [module()](https://docs.angularjs.org/api/ngMock/function/angular.mock.module) does.
Pass module names, config functions or objects. The passed arguments are executed when `run()` is called.

Returns the Mox instance to make chaining possible.

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

    mox.mockServices('FooResource')

Multiple services:

    mox.mockServices([
       'fooResource',
       'barService'
    ])

Returns the Mox instance to make chaining possible.

### mox.mockConstants()

Register constants to be mocked and define their value. These mocks can be injected in a config function immediately.
Pass a name and value as parameters for one constant, or an object with definitions for multiple constants.

One constant:

    mox.mockConstant('FooConstant', 'value')
    
Multiple constants:

    mox.mockConstant({
      FooConstant: value,
      BarConstant: anotherValue
    })

### mox.mockDirectives()

Register directive(s) to be mocked.

Accepts 3 types of input:

1. a directive name: the same as with an array, but just for one directive
2. a directive factory object, for you won mock implementation (name property is required)
3. an array of directive names (see 1) or objects (see 2)

Returns the Mox instance to make chaining possible.

### mox.disableDirectives()

"Disables" the given list of directives, not just mocking them.
Accepts directive name or array with directive names to disable.

Returns the Mox instance to make chaining possible.

### mox.mockControllers()

Registers controllers to be mocked. This is useful for view specs where the template contains an `ng-controller`.
The view's `$scope` is not set by the controller anymore, but you have to set the `$scope` manually.

    mox.mockControllers('FooController')

Returns the Mox instance to make chaining possible.

### mox.run()

Executes all registered stuff so that the actual mocking is done. If you forget to call `run()`, nothing will be mocked.
The real services will be overwritten by mocks via `$provide.value`, so when you inject `FooService`, you get the mocked service, including
spies on all methods.

As bonus, the mocks are added to the `mox.get` object, so that you can access mocks easily in your specs without an ugly `inject(function() {})` wrapper.

Returns the result of angular.mocks.module`, so that the call can passed as argument to `beforeEach`. So chaining is not possible after `run()`.

    beforeEach(mox.module('myApp').run());

## Mox configuration methods

### mox.setupResults()

Pass an object with a configuration for the spy functions of the already registered mocks.
If the value is a function, it will be set using Jasmine's `andCallFake()`, otherwise it uses `andReturn`

    mox.setupResults({
      fooService: {
        getBars: ['barData1', 'barData2'],
        getTranslation: function (key) {
          return key == 'fooTitle' ? 'mock title' : 'mock other string';
        }
      },
      barFilter: 'mock filter result' // Object not allowed as return value
    });
  
### mox.mockTemplates()

Replaces templates with a mock template: `<div>This is a mock for views/templatename.html</div>` or a custom template.
This is very useful when you want to mock an `ng-include` in your view spec. The mocked templates will be tested in a
separate view spec.

Note that this method is not called in the chain that ends with `run()`. This is because `mockTemplates` needs the injector
to already be initialized, which is done after calling `run()`.

    mox.mockTemplates([
      'scripts/views/templatename.html',
      { 'scripts/views/anotherTemplate.html': '<tr><td></td></tr>' }
    ])
    
Or just one template:

    mox.mockTemplates('scripts/views/templatename.html');
    
Or:

    mox.mockTemplate({ 'scripts/views/anotherTemplate.html': '<tr><td></td></tr>' });
    
## Static methods/properties

### mox.save()

Registers a mock and save it to the cache.
This method usually is used when defining a custom mock factory function or when manually creating a mock.

    mox.save($provide, 'FooService', fooServiceMock);

Returns the saved mock.

### mox.get

When a mock is registered, you can get the mock without injecting it.

    var fooService = mox.get.FooService;
    
### mox.factories

Call a mock factory function manually without chaining via `mox`.
The factory functions needs to be defined in moxConfig.
    
    mox.factories.FooServices($provide);
    
## Testing a $resource

Setting up a resource test normally involves a lot of boilerplate code, like injecting $httpBackend, flushing, etc.
With Mox you can test a resource in 5 lines of code or less.

    requestTest()
      .whenMethod(FooResource.query, { bar: baz })
      .expectGet('api/foo?bar=baz')
      .andRespond([])
      .run();

When you test a resource that returns an object, such as `get()`, `andRespond({})` is not necessary, since
`requestTest()` responds with `{}` by default.

## Utility functions

Finally this framework contains a lot of utility functions:

* Functions to prevent injecting common stuff like `$q`, `$controller`, `$compile` and `$rootScope` in the spec
* Functions for quick promise and resource result mocking
* Functions to prevent a lot of DOM traversals (extendedElement, extendElement)

### Generic shortcuts for specs

* `createScope`: Creates a new $rootScope child. The optional passed argument is an object 
* `createController(controllerName)`: Creates and initialized a controller
* `getMockData(fileName)`: Asynchronously loads the contents of a JSON file. The argument is a path without '.json'.

### Compile shortcuts

* `compileTemplate(path, $scope)`: Returns a compiled and linked template and digest the $scope.
* `compileHtml(html, $scope)`: Returns compiled and linked HTML and digest the $scope. Useful for directives.
* `compileHtmlOnDom(html)`: Compiles given html on the actual browser's DOM using window.document instead of an isolated tree.
The regular compileHtml() function is preferred as it's faster and does not require manual cleanup.
Only use this function when you cannot trigger browser behaviour using compileHtml().

Be sure to clean up the generated HTML afterwards by calling removeCompiledHtmlFromDom() in an afterEach.
* `removeCompiledHtmlFromDom`: Removes the html that was created using `compileHtmlOnDom()` from the DOM.

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

### extendElement

Extends the element with function to be called on that element. The only extended function currently is `findByBinding`
which traverses that childNodes to find an element with the given binding. It mimics the Protractor findBindings / by.binding.

### extendedElement

Extends the element with nodes that are accessible via a property

    <div class="container">
      <h1>The container</h1>
      <p class="sub">with a subtitle</p>
    </div>

    var element = extendedElement(rootElement.find('.container'), {title: 'h1', subtitle: 'p.sub'});
    element.title.text() // The container

### extendedElementWithChildren

Extends the element with its children. The children are accessible via the provided property list.

     <table><thead><tr>
       <th>Your name</th><th> Your age</th>
     </tr></thead></table>

     var element = extendedElementWithChildren(rootElement.find('table thead tr'), ['name','age']);
     element.name.text() // Your name

## Contributors

* [@fvanwijk](https://github.com/fvanwijk)
* [@fwielstra](https://github.com/fwielstra)
* [@AlbertBrand](https://github.com/AlbertBrand)
* [@jbnicolai](https://github.com/jbnicolai)
* [@mikewoudenberg](https://github.com/mikewoudenberg)
