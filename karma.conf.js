module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      'node_modules/lodash/lodash.js',
      'node_modules/jquery/dist/jquery.js',
      'node_modules/angular/angular.js',
      'node_modules/angular-resource/angular-resource.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/jasmine-jquery/lib/jasmine-jquery.js',
      'node_modules/jasmine-mox-matchers/src/jasmine-mox-matchers.js',

      'src/**/*.js',

      'test/mock/*.js',
      'test/mock/html/**/*.html',
      'test/spec/**/*.js'
    ],
    exclude: [],
    port: 8080,
    reporters: ['progress', 'coverage'],
    coverageReporter: {
      dir: 'test/coverage',
      reporters: [
        { type: 'lcov' },
        { type: 'text-summary' },
        { type: 'json' }
      ]
    },
    preprocessors: {
      'src/**/*.js': ['coverage']
    },
    captureTimeout: 5000,
    logLevel: config.LOG_ERROR,
    autoWatch: false,
    browsers: ['PhantomJS2'],
    singleRun: true
  });
};
