module.exports = [
  {
    type: 'lib',
    files: [
      'node_modules/lodash/lodash.js',
      'node_modules/jquery/dist/jquery.js',
      'node_modules/angular/angular.js',
      'node_modules/angular-resource/angular-resource.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'node_modules/jasmine-jquery/lib/jasmine-jquery.js',
      'node_modules/jasmine-mox-matchers/dist/jasmine-mox-matchers.js'
    ]
  },
  {
    type: 'config',
    files: [

    ]
  },
  {
    type: 'src',
    files: [
      'test/mock/*.js',
      'src/**/*.js'
    ]
  },
  {
    type: 'mock',
    files: [
      'test/mock/html/**/*.html'
    ]
  },
  {
    type: 'specs',
    files: [
      'test/spec/**/helpers-spec.js'
    ]
  }
];
