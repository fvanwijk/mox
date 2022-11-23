var wallabyFiles = require('test-runner-config').getWallabyFiles(
  require('./test/mock/testFiles')
);

module.exports = function() {
  return {
    //testFramework: 'jasmine@1.3.1',
    files: wallabyFiles.files,
    tests: wallabyFiles.tests,
    env: {
      runner: require('jsdom').path,
      params: {
        runner: '--web-security=false'
      }
    }
  };
};
