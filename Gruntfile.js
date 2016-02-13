module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  var paths = {
    src: 'src',
    test: 'test',
    dist: 'dist'
  };

  grunt.initConfig({
    pkg: grunt.file.readJSON('bower.json'),
    clean: {
      dist: paths.dist,
      coverage: paths.test + '/coverage'
    },
    concat: {
      dist: {
        src: [
          paths.src + '/**/*.js',
          '!' + paths.src + '/moxConfig.js'
        ],
        dest: paths.dist + '/<%= pkg.name %>.js'
      }
    },
    copy: {
      dist: {
        src: paths.src + '/moxConfig.js',
        dest: paths.dist + '/moxConfig.js'
      }
    },
    coverage: {
      dist: {
        options: {
          thresholds: {
            statements: 47,
            branches: 45,
            functions: 38,
            lines: 47
          },
          dir: 'coverage',
          root: paths.test
        }
      }
    },
    jscs: {
      options: {
        config: './.jscsrc'
      },
      src: {
        src: paths.src + '/**/*.js'
      },
      test: {
        src: paths.test + '/spec/**/*.js'
      },
      config: ['*.js', paths.test + '/{,!(spec)}/*.js']
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      src: {
        src: paths.src + '/**/*.js'
      },
      test: {
        options: {
          jshintrc: paths.test + '/.jshintrc'
        },
        src: paths.test + '/spec/**/*.js'
      },
      config: ['*.js', paths.test + '/{,!(spec)}/*.js']
    },
    uglify: {
      dist: {
        expand: true,
        cwd: paths.dist + '/',
        src: ['*.js', '!moxConfig.js'],
        dest: paths.dist + '',
        ext: '.min.js'
      }
    },
    karma: {
      dist: {
        configFile: 'karma.conf.js'
      }
    }
  });

  grunt.registerTask('build', ['clean', 'test', 'copy', 'concat', 'uglify']);
  grunt.registerTask('test', ['jscs', 'jshint', 'karma', 'coverage']);
  grunt.registerTask('default', ['build']);

};
