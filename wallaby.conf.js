var webpackConfig = file => ({ pattern: file, instrument: true, load: false, ignore: false });
var wallabyFiles = require('test-runner-config').getWallabyFiles(require('./test/mock/testFiles'), {
  src: webpackConfig,
  specs: webpackConfig
});
var wallabyWebpack = require('wallaby-webpack');
var webpackPostprocessor = wallabyWebpack({});

module.exports = function (wallaby) {
  return {
    //testFramework: 'jasmine@1.3.1',
    files: wallabyFiles.files,
    tests: wallabyFiles.tests,
    compilers: {
      '**/*.js': wallaby.compilers.babel()
    },
    postprocessor: webpackPostprocessor,

    bootstrap: function () {
      window.__moduleBundler.loadTests();
    },
    env: {
      runner: require('phantomjs-prebuilt').path,
      params: {
        runner: '--web-security=false'
      }
    }
  };
};
