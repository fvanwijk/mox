var wallabyFiles = require('test-runner-config').getWallabyFiles(
  require('./test/mock/testFiles')
);

module.exports = function() {
  return {
    //testFramework: 'jasmine@1.3.1',
    files: wallabyFiles.files,
    tests: wallabyFiles.tests,
    env: {
      runner: require('phantomjs-prebuilt').path,
      params: {
        runner: '--web-security=false'
      }
    }
  };
};
