var karmaFiles = require('test-runner-config').getKarmaFiles(require('./test/mock/testFiles'), {
  specs: function (file) { return { pattern: file, instrument: true, load: false, ignore: false }; }
});
karmaFiles.files = karmaFiles.files.filter(function (file) {
  return !/^src/.test(file);
});
console.log(karmaFiles.files);

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: karmaFiles.files,
    exclude: karmaFiles.exclude,
    port: 8080,
    plugins: [
      require('karma-jasmine'),
      require('karma-webpack'),
      require('karma-phantomjs-launcher'),
      require('karma-coverage'),
      require('karma-sourcemap-loader')
    ],
    webpack: {
      module: {
        loaders: [
          {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel'
          },
          {
            test: /\.js$/,
            include: /src/,
            loader: 'isparta'
          }
        ]
      },
      devtool: 'inline-source-map'
    },
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
      'src/**/*.js': ['webpack', 'coverage', 'sourcemap'],
      'test/spec/**/*.js': ['webpack', 'sourcemap']
    },
    captureTimeout: 5000,
    logLevel: config.LOG_ERROR,
    autoWatch: false,
    browsers: ['PhantomJS'],
    singleRun: true
  });
};
