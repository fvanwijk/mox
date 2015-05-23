module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/jasmine-mox-matchers/src/jasmine-mox-matchers.js',

      'src/**/*.js',
      'test/**/*.js'
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
    browsers: ['PhantomJS'],
    singleRun: true
  });
};
