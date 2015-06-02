describe('The helper functions', function () {

  describe('Angular shortcuts', function () {
    describe('createScope()', function () {
      beforeEach(function () {
        mox.module('mox').run();
      });

      it('should return a new non-isolate scope', inject(function ($rootScope) {
        var newScope = createScope();
        expect(newScope.$id).not.toBe($rootScope.$id);
        expect(newScope.$parent).toBe($rootScope);
      }));

      it('should fill the scope with the parameters', function () {
        expect(createScope({ key: 'value', key2: 'value2' })).toEqual(jasmine.objectContaining({ key: 'value', key2: 'value2' }));
      });

      it('should set the created scope on the currentSpec', function () {
        var newScope = createScope();
        var anotherScope = createScope();
        expect(this.$scope).not.toBe(newScope);
        expect(this.$scope).toBe(anotherScope);
      });
    });

    describe('createController()', function () {
      beforeEach(function () {
        angular.module('mox')
          .service('FooService', function () {
            this.foo = 'bar';
          })
          .controller('FooController', function ($scope, FooService) {
            this.$scope = $scope;
            this.FooService = FooService;
          });
        mox.module('mox').run();
      });

      it('should instantiate a controller with the last created scope', function () {
        var newScope = createScope();
        var controller = createController('FooController');
        expect(controller.$scope).toBe(newScope);
        expect(controller.FooService.foo).toBe('bar');
      });

      it('should instantiate a controller with the given scope', inject(function () {
        var newScope = createScope();
        var anotherScope = createScope();
        var controller = createController('FooController', newScope);
        expect(controller.$scope).toBe(newScope);
        expect(controller.$scope).not.toBe(anotherScope);
      }));

      it('should override injections if passed', function () {
        var controller = createController('FooController', createScope(), { FooService: 'mocked service' });
        expect(controller.FooService).toBe('mocked service');
      });
    });
  });

  describe('Compile shortcuts', function () {
    beforeEach(function () {
      mox.module('mox').run();
    });

    describe('compileHtml()', function () {
      it('should compile HTML and link it to the given scope', function () {
        expect(compileHtml('<div id="test">{{scopeVar}}</div>', createScope({ scopeVar: 'contents' }))).toHaveText('contents');
      });

      describe('when there is not scope passed as argument', function () {
        it('should link to the last created scope', function () {
          createScope({ scopeVar: 'contents' });
          expect(compileHtml('<div id="test">{{scopeVar}}</div>')).toHaveText('contents');
        });
      });

      it('should add the element to the current spec', function () {
        expect(compileHtml('<div></div>', createScope())).toBe(this.element);
      });

      describe('when the appendToBody parameter is not given or is truthy', function () {
        it('should append the compiled and linked element directly to the body', function () {
          compileHtml('<div id="test"></div>', createScope());
          expect(angular.element(document.body).find('#test')).toExist();
          expect(angular.element(document.body).find('#container #test')).not.toExist();
        });

        describe('when there is testTemplatePath and a testTemplateAppendSelector set', function () {
          beforeEach(function () {
            // See test/mock/html/container.html
            mox.testTemplatePath = 'container.html';
            mox.testTemplateAppendSelector = '#container';
          });

          it('should append the test template to the body and append the compiled element to the element in the test template with the testTemplateAppendSelector', function () {
            compileHtml('<div id="test"></div>', createScope());
            expect(angular.element(document.body).find('#container #test')).toExist();
          });
        });
      });

      describe('when the appendToBody parameter is falsy', function () {
        it('should not append the compiled and linked element to the body', function () {
          compileHtml('<div id="test"></div>', createScope(), false);
          var elem = angular.element(document.body).find('#test');
          expect(elem).not.toExist();
        });
      });
    });

    describe('compileTemplate()', function () {
      beforeEach(function () {
        inject(function ($templateCache) {
          $templateCache.put('test.html', '<div id="test">{{scopeVar}}</div>');
        });
      });

      it('should retrieve the template, compile its HTML contents and link to the given scope', function () {
        expect(compileTemplate('test.html', createScope({ scopeVar: 'contents' }))).toHaveText('contents');
      });

      it('should wrap the template in a div, in case the template has no root element', function () {
        expect(compileTemplate('test.html', createScope()).find('#test')).toExist();
      });

      it('should pass the scope and appendToBody parameter to the function that compiles the HTML', function () {
        compileHtml = jasmine.createSpy('compileHtml');
        compileTemplate('test.html', createScope(), true);
        expect(compileHtml).toHaveBeenCalledWith(jasmine.any(String), this.$scope, true);
      });

    });
  });
});
