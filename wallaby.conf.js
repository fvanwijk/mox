module.exports = function () {
  function n(file) { return { pattern: file, instrument: false }; }

  return {
    //testFramework: 'jasmine@1.3.1',

    files: [
      'bower_components/lodash/lodash.js',
      'bower_components/jquery/dist/jquery.js',
      n('bower_components/angular/angular.js'),
      n('bower_components/angular-resource/angular-resource.js'),
      n('bower_components/angular-mocks/angular-mocks.js'),
      'bower_components/jasmine-jquery/lib/jasmine-jquery.js',
      'bower_components/jasmine-mox-matchers/src/jasmine-mox-matchers.js',

      // Mock data
      { pattern: 'test/mock/**/*.json', instrument: false, load: false },
      n('test/mock/html/**/*.html'),
      n('test/mock/*.js'),

      'src/**.js'
    ],
    tests: [
      'test/spec/**/*.js'
    ]
  };
};
