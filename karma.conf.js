const path = require('path');
const karmaFiles = require('test-runner-config').getKarmaFiles(
  require('./test/mock/testFiles')
);

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: karmaFiles.files,
    exclude: karmaFiles.exclude,
    reporters: ['progress', 'coverage'],
    preprocessors: {
      'src/**/*.js': ['coverage']
    },
    webpack: {
      mode: 'none',
      module: {
        rules: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
          },
          {
            test: /\.js$/,
            use: {
              loader: 'istanbul-instrumenter-loader',
              options: { esModules: true }
            },
            include: path.resolve('src/')
          }
        ]
      }
    },
    coverageIstanbulReporter: {
      dir: 'test/coverage',
      subdir: '.',
      reports: ['lcov', 'text-summary', 'json'],
      thresholds: {
        statements: 47,
        branches: 45,
        functions: 38,
        lines: 47
      }
    },
    coverageReporter: {
      dir: 'test/coverage',
      reporters: [{ type: 'lcov' }, { type: 'text-summary' }, { type: 'json' }]
    },
    port: 8080,
    runnerPort: 9100,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['jsdom'],
    captureTimeout: 5000,
    singleRun: true
  });
};
