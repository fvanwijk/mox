module.exports = function () {
  function n(file) { return { pattern: file, instrument: false }; }

  return {
    //testFramework: 'jasmine@1.3.1',

    files: [
      n('bower_components/angular/angular.js'),
      n('bower_components/angular-mocks/angular-mocks.js'),
      'bower_components/jasmine-mox-matchers/src/jasmine-mox-matchers.js',
      'src/**.js'
    ],
    tests: [
      'test/spec/**/*.js'
    ]
  };
};
