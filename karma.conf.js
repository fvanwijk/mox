var karmaFiles = require('test-runner-config').getKarmaFiles(require('./test/mock/testFiles'));

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: karmaFiles.files,
    exclude: karmaFiles.exclude,
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
