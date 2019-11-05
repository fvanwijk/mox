describe('The helper functions', function() {
  describe('Test helpers', function() {
    beforeEach(function() {
      angular
        .module('mox')
        .value('x', 1)
        .value('y', 2);
    });

    describe('inject()', function() {
      it('should throw an exception when the injector is not yet ready', function() {
        expect(_.partial(mox.inject, 'x')).toThrow(
          Error(
            'Sorry, cannot inject x because the injector is not ready yet. Please load a module and call mox.run() or inject()'
          )
        );
      });

      describe('when there is one argument provided', function() {
        it('should return the service that is requested', function() {
          mox.module('mox').run();
          expect(mox.inject('x')).toBe(1);
        });
      });

      describe('when there are multiple arguments provided', function() {
        it('should return an object containing the services that are requested', function() {
          mox.module('mox').run();
          expect(mox.inject('x', 'y')).toEqual({
            x: 1,
            y: 2
          });
        });
      });
    });
  });

  describe('Angular shortcuts', function() {
    describe('createScope()', function() {
      beforeEach(function() {
        mox.module('mox').run();
      });

      it('should return a new non-isolate scope', inject(function($rootScope) {
        var newScope = createScope();
        expect(newScope.$id).not.toBe($rootScope.$id);
        expect(newScope.$parent).toBe($rootScope);
      }));

      it('should fill the scope with the parameters', function() {
        expect(createScope({ key: 'value', key2: 'value2' })).toEqual(
          jasmine.objectContaining({ key: 'value', key2: 'value2' })
        );
      });

      it('should set the created scope on the currentSpec', function() {
        var newScope = createScope();
        var anotherScope = createScope();
        expect(this.$scope).not.toBe(newScope);
        expect(this.$scope).toBe(anotherScope);
      });
    });

    describe('createController()', function() {
      beforeEach(function() {
        angular
          .module('mox')
          .service('FooService', function() {
            this.foo = 'bar';
          })
          .controller('FooController', function($scope, FooService) {
            this.$scope = $scope;
            this.FooService = FooService;
          });
        mox.module('mox').run();
      });

      it('should instantiate a controller with the last created scope', function() {
        var newScope = createScope();
        var controller = createController('FooController');
        expect(controller.$scope).toBe(newScope);
        expect(controller.FooService.foo).toBe('bar');
      });

      it('should instantiate a controller with the given scope', inject(function() {
        var newScope = createScope();
        var anotherScope = createScope();
        var controller = createController('FooController', newScope);
        expect(controller.$scope).toBe(newScope);
        expect(controller.$scope).not.toBe(anotherScope);
      }));

      it('should override injections if passed', function() {
        var controller = createController('FooController', createScope(), {
          FooService: 'mocked service'
        });
        expect(controller.FooService).toBe('mocked service');
      });

      it('should pass bindings if passed', function() {
        var controller = createController(
          'FooController',
          createScope(),
          { FooService: 'mocked service' },
          { binding: 42 }
        );
        expect(controller.binding).toBe(42);
      });
    });
  });

  describe('Compile shortcuts', function() {
    beforeEach(function() {
      mox.module('mox').run();
    });

    describe('compileHtml()', function() {
      it('should compile HTML and link it to the given scope', function() {
        expect(
          compileHtml(
            '<div id="test">{{scopeVar}}</div>',
            createScope({ scopeVar: 'contents' })
          )
        ).toHaveText('contents');
      });

      describe('when there is not scope passed as argument', function() {
        it('should link to the last created scope', function() {
          createScope({ scopeVar: 'contents' });
          expect(compileHtml('<div id="test">{{scopeVar}}</div>')).toHaveText(
            'contents'
          );
        });
      });

      it('should add the element to the current spec', function() {
        expect(compileHtml('<div></div>', createScope())).toBe(this.element);
      });

      describe('when the appendToBody parameter is not given or is truthy', function() {
        it('should append the compiled and linked element directly to the body', function() {
          compileHtml('<div id="test"></div>', createScope());
          expect(angular.element(document.body).find('#test')).toExist();
          expect(
            angular.element(document.body).find('#container #test')
          ).not.toExist();
        });

        it('should only append the compile element to the body once', function() {
          compileHtml('<div id="test"></div>', createScope());
          compileHtml('<div id="test2"></div>', createScope());
          expect(angular.element(document.body).find('#test')).not.toExist();
        });

        describe('when there is testTemplatePath and a testTemplateAppendSelector set', function() {
          beforeEach(function() {
            // See test/mock/html/container.html
            mox.testTemplatePath = 'container.html';
            mox.testTemplateAppendSelector = '#container';
          });

          it('should append the test template to the body and append the compiled element to the element in the test template with the testTemplateAppendSelector', function() {
            compileHtml('<div id="test"></div>', createScope());
            expect(
              angular.element(document.body).find('#container #test')
            ).toExist();
          });
        });
      });

      describe('when the appendToBody parameter is falsy', function() {
        it('should not append the compiled and linked element to the body', function() {
          compileHtml('<div id="test"></div>', createScope(), false);
          var elem = angular.element(document.body).find('#test');
          expect(elem).not.toExist();
        });
      });
    });

    describe('compileTemplate()', function() {
      beforeEach(function() {
        inject(function($templateCache) {
          $templateCache.put('test.html', '<div id="test">{{scopeVar}}</div>');
        });
      });

      it('should retrieve the template, compile its HTML contents and link to the given scope', function() {
        expect(
          compileTemplate('test.html', createScope({ scopeVar: 'contents' }))
        ).toHaveText('contents');
      });

      it('should wrap the template in a div, in case the template has no root element', function() {
        expect(
          compileTemplate('test.html', createScope()).find('#test')
        ).toExist();
      });

      it('should pass the scope and appendToBody parameter to the function that compiles the HTML', function() {
        var origCompileHtml = compileHtml;
        compileHtml = jasmine.createSpy('compileHtml');
        compileTemplate('test.html', createScope(), true);
        expect(compileHtml).toHaveBeenCalledWith(
          jasmine.any(String),
          this.$scope,
          true
        );
        compileHtml = origCompileHtml;
      });
    });

    describe('promise shortcuts', function() {
      describe('unresolvedPromise()', function() {
        it('should return a promise that is unresolved', function() {
          expect(unresolvedPromise()).toBePromise();
          expect(unresolvedPromise()).not.toResolve();
        });
      });

      describe('promise()', function() {
        it('should return a promise that resolves with the JSON-copied argument', function() {
          var resolve = { resolve: true, $save: angular.noop };
          expect(promise(resolve)).toResolveWith(function(result) {
            expect(result).not.toBe(resolve);
            expect(result).not.toEqual(resolve);
            expect(result).toEqual(_.omit(resolve, '$save'));
          });

          expect(promise(promise('resolve'))).toResolveWith(promise('resolve'));
        });

        it('should not copy the argument when resolving', function() {
          var resolve = { resolve: true };
          expect(promise(resolve, true)).toResolveWith(function(result) {
            expect(result).toBe(resolve);
          });
        });
      });

      describe('resourcePromise()', function() {
        it('should return a promise that resolves with the copied argument', function() {
          var resource = {
            $save: angular.noop,
            data: 'result'
          };
          expect(resourcePromise(resource)).toResolveWith(function(result) {
            expect(result).toEqual(resource);
            expect(result).not.toBe(resource);
          });
        });
      });

      describe('reject()', function() {
        it('should return a rejecting promise', function() {
          expect(reject('reject')).toRejectWith('reject');
        });
      });

      describe('resourceResult()', function() {
        it('should return a resource result that resolves with the data argument', function() {
          var resourceData = {
            $save: angular.noop,
            data: 'result'
          };

          expect(resourceResult(resourceData).$promise).toResolveWith(function(
            result
          ) {
            expect(result).not.toBe(resourceData);
            expect(result).not.toEqual(resourceData);
            expect(result).toEqual(_.omit(resourceData, '$save'));
          });
        });

        it('should return a resource result that resolves with the data argument and is enriched with mock methods', function() {
          var resourceData = {
            data: 'result'
          };
          var mock = { $save: angular.noop };

          expect(resourceResult(resourceData, mock).$promise).toResolveWith(
            function(result) {
              expect(result).toEqual(
                _.extend(mock, {
                  data: 'result'
                })
              );
              expect(result).toEqual(resourceData);
            }
          );
        });
      });

      describe('nonResolvingResourceResult()', function() {
        it('should return a resource result that does not resolve', function() {
          var result = nonResolvingResourceResult();
          expect(result).toEqual({
            $promise: mox.inject('$q').defer().promise
          });
          expect(result.$promise).not.toResolve();
        });
      });

      describe('rejectingResourceResult()', function() {
        it('should return a resource result that rejects', function() {
          expect(rejectingResourceResult('reject').$promise).toRejectWith(
            'reject'
          );
        });
      });
    });

    describe('addSelectors()', function() {
      var element;
      beforeEach(function() {
        element = compileHtml(
          '\
        <root>\
          <element>\
            <child id="1">\
              <child></child>\
            </child>\
            <child id="2"></child>\
          </element>\
        </root>\
        ',
          createScope()
        );
      });

      it('should add simple selector', function() {
        addSelectors(element, {
          simple: 'element',
          noMatch: 'xyz'
        });
        expect(element.simple()).toExist();
        expect(element.noMatch()).not.toExist();
      });

      it('should support object notation', function() {
        addSelectors(element, {
          full: {
            selector: 'element'
          }
        });
        expect(element.full()).toExist();
      });

      it('should add simple sub selectors', function() {
        addSelectors(element, {
          withSub: {
            selector: 'element',
            sub: {
              id1: '#1',
              id2: '#2',
              id3: '#3'
            }
          }
        });
        expect(element.withSub()).toExist();
        expect(element.withSub().id1()).toExist();
        expect(element.withSub().id2()).toExist();
        expect(element.withSub().id3()).not.toExist();
      });

      it('should add full object sub selector with sub of sub', function() {
        addSelectors(element, {
          withSub: {
            selector: 'element',
            sub: {
              id1: {
                selector: '#1',
                sub: {
                  subChild: 'child',
                  noMatch: 'element'
                }
              },
              noMatch: {
                selector: '#3',
                sub: {
                  noMatch: 'element'
                }
              }
            }
          }
        });
        expect(element.withSub()).toExist();
        expect(element.withSub().id1()).toExist();
        expect(
          element
            .withSub()
            .id1()
            .subChild()
        ).toExist();
        expect(
          element
            .withSub()
            .id1()
            .noMatch()
        ).not.toExist();
        expect(
          element
            .withSub()
            .noMatch()
            .noMatch()
        ).not.toExist();
      });

      it('should add simple child selectors', function() {
        addSelectors(element, {
          withChild: {
            selector: 'element',
            children: ['child1', 'child2', 'child3']
          }
        });
        expect(element.withChild()).toExist();
        expect(element.withChild().child1()).toExist();
        expect(element.withChild().child2()).toExist();
        expect(element.withChild().child3()).not.toExist();
      });

      it('should add full object child selector with sub of sub', function() {
        addSelectors(element, {
          withChild: {
            selector: 'element',
            children: [
              {
                name: 'child1',
                sub: {
                  subChild: 'child',
                  noMatch: 'element'
                }
              }
            ]
          }
        });
        expect(element.withChild()).toExist();
        expect(element.withChild().child1()).toExist();
        expect(
          element
            .withChild()
            .child1()
            .subChild()
        ).toExist();
        expect(
          element
            .withChild()
            .child1()
            .noMatch()
        ).not.toExist();
      });

      it('should add full object child selector with children of sub', function() {
        addSelectors(element, {
          withChild: {
            selector: 'element',
            children: [
              {
                name: 'child1',
                children: ['subChild']
              }
            ]
          }
        });
        expect(element.withChild()).toExist();
        expect(element.withChild().child1()).toExist();
        expect(
          element
            .withChild()
            .child1()
            .subChild()
        ).toExist();
      });

      it('should replace placeholders in selectors', function() {
        addSelectors(element, {
          placeholder: 'element #{0}'
        });
        expect(element.placeholder()).not.toExist();
        expect(element.placeholder(1)).toExist();
        expect(element.placeholder(2)).toExist();
        expect(element.placeholder(3)).not.toExist();

        addSelectors(element, {
          placeholder2: '{0} {1}'
        });
        expect(element.placeholder2('element', 'child')).toExist();
      });

      it('should allow grouping of selectors without parent selectors', function() {
        addSelectors(element, {
          group1: {
            sub: {
              element: '#1'
            }
          },
          group2: {
            sub: {
              element: '#2'
            }
          }
        });
        expect(element.group1().element()).toHaveAttr('id', '1');
        expect(element.group2().element()).toHaveAttr('id', '2');
      });

      it('should allow overwriting existing selector functions on the element', function() {
        expect(element.root).toBeUndefined();
        addSelectors(element, {
          element: '#1'
        });
        addSelectors(element, {
          element: '#2'
        });
        expect(element.element()).toHaveAttr('id', '1');
      });

      it('should throw an exception when trying to overwrite existing properties on the element', function() {
        expect(function() {
          addSelectors(element, {
            val: 'element'
          });
        }).toThrow();

        element.abc = '1';
        expect(function() {
          addSelectors(element, {
            abc: 'element'
          });
        }).toThrow();
      });

      it('should support repeater definitions', function() {
        addSelectors(element, {
          childElements: {
            repeater: 'element > child',
            sub: {
              kid: 'child'
            }
          }
        });

        expect(element.childElements()).toHaveLength(2);
        expect(element.childElements(0).kid()).toExist();
        expect(element.childElements(1).kid()).not.toExist();
      });

      it('should ignore the children and sub definitions for the repeater itself', function() {
        addSelectors(element, {
          childElements: {
            repeater: 'element > child',
            sub: {
              kid: 'child'
            },
            children: ['kiddo']
          }
        });

        expect(element.childElements().kid).toBeUndefined();
        expect(element.childElements().kiddo).toBeUndefined();
        expect(element.childElements(0).kid).toBeDefined();
        expect(element.childElements(0).kiddo).toBeDefined();
      });
    });
  });

  describe('requestTest() DSL for testing resources', function() {
    beforeEach(function() {
      mox.module('mox').run();
    });

    it('should setup the test', function() {
      var test = requestTest();
      expect(test._httpMethod).toBe('GET');
      expect(test._data).toBeNull();
    });

    it('should set the path', function() {
      expect(requestTest().whenPath('path')._path).toBe('path');
    });

    it('should set the method with arguments', function() {
      var test = requestTest().whenMethod('get', 'arg1', 'arg2');
      expect(test._method).toBe('get');
      expect(test._methodArguments).toEqual(['arg1', 'arg2']);
    });

    it('should have whenCall as alias for whenMethod', function() {
      expect(requestTest().whenCall('get')._method).toBe('get');
    });

    it('should set the httpMethod', function() {
      expect(requestTest().whenHttpMethod('PUT')._httpMethod).toBe('PUT');
    });

    it('should set the data', function() {
      expect(requestTest().whenData('data')._data).toBe('data');
    });

    it('should set the httpMethod, path and data in one call', function() {
      var test = requestTest().expectRequest('GET', 'path', 'data');
      expect(test._httpMethod).toBe('GET');
      expect(test._path).toBe('path');
      expect(test._data).toBe('data');
    });

    it('should set the response', function() {
      var test = requestTest().andRespond('response');
      expect(test._response).toBe('response');
      expect(test._expectedResult).toBe('response');
    });

    it('should set the expectation', function() {
      expect(requestTest().andExpect('response')._expectedResult).toBe(
        'response'
      );
    });

    it('should set the httpMethod GET and path', function() {
      var test = requestTest().expectGet('path', 'data'); // data is omitted
      expect(test._httpMethod).toBe('GET');
      expect(test._path).toBe('path');
      expect(test._data).toBeUndefined();
    });

    it('should set the httpMethod POST, with data and path', function() {
      var test = requestTest().expectPost('path', 'data');
      expect(test._httpMethod).toBe('POST');
      expect(test._path).toBe('path');
      expect(test._data).toBe('data');
    });

    it('should set the httpMethod PUT, with data and path', function() {
      var test = requestTest().expectPut('path', 'data');
      expect(test._httpMethod).toBe('PUT');
      expect(test._path).toBe('path');
      expect(test._data).toBe('data');
    });

    it('should set the httpMethod DELETE and path', function() {
      var test = requestTest().expectDelete('path', 'data');
      expect(test._httpMethod).toBe('DELETE');
      expect(test._path).toBe('path');
      expect(test._data).toBe('data');
    });

    it('should set the expected query params', function() {
      expect(
        requestTest().expectQueryParams({ param1: 'param1' })
          ._expectedQueryParams
      ).toEqual({ param1: 'param1' });
    });

    describe('when testing the resource', function() {
      it('should pass when testing the resource', function() {
        function callMethod(args) {
          expect(args).toBe('args');
          return mox
            .inject('$http')
            .post('path?param1=param1', { data: 'data' });
        }

        requestTest()
          .whenMethod(callMethod, 'args')
          .expectPost('path', { data: 'data' })
          .expectQueryParams({ param1: 'param1' })
          .run();
      });

      it('should pass when providing the path without queryParams', function() {
        function callMethod() {
          return mox.inject('$http').post('path');
        }

        requestTest()
          .whenMethod(callMethod)
          .expectPost('path')
          .run();
      });

      it('should pass when not providing the path but only queryParams', function() {
        function callMethod() {
          return mox
            .inject('$http')
            .post('path?param1=param1', { data: 'data' });
        }

        requestTest()
          .whenMethod(callMethod)
          .expectQueryParams({ param1: 'param1' })
          .expectPost()
          .run();
      });

      it('should test a failing resource call', function() {
        function callMethod() {
          return mox
            .inject('$http')
            .post('path')
            .then(function() {
              return reject('reject');
            });
        }

        requestTest()
          .whenMethod(callMethod)
          .expectPost('path')
          .fail();
      });

      it('should test with a resolving resource call and do additional tests', function() {
        function callMethod() {
          return mox.inject('$http').post('path');
        }

        requestTest()
          .whenMethod(callMethod)
          .expectPost('path')
          .andExpect(function(response) {
            expect(response.status).toEqual(200);
          })
          .run();
      });

      it('should test with a resolving resource call and do additional tests', function() {
        function callMethod() {
          return mox
            .inject('$http')
            .post('path')
            .then(function() {
              return reject('reject');
            });
        }

        requestTest()
          .whenMethod(callMethod)
          .expectPost('path')
          .andExpect(function(response) {
            expect(response).toBe('reject');
          })
          .fail();
      });
    });
  });
});
