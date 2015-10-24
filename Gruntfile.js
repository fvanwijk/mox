module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('bower.json'),
    paths: {
      src: 'src',
      test: 'test',
      dist: 'dist'
    },
    clean: {
      dist: {
        files: [
          {
            dot: true,
            src: [
              '<%= paths.dist %>/**/*',
              '!<%= paths.dist %>/docs'
            ]
          }
        ]
      },
      coverage: 'test/coverage',
      docs: '<%= paths.dist %>/docs/**/*'
    },
    connect: {
      options: {
        hostname: 'localhost',
        port: 9001,
        keepalive: true
      },
      docs: {
        options: {
          base: '<%= paths.dist %>/docs'
        }
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= paths.src %>/**/*.js'
        ]
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['<%= paths.test %>/spec/{,*/}*.js']
      }
    },
    jscs: {
      options: {
        config: './.jscsrc'
      },
      all: {
        files: {
          src: ['<%= paths.src %>/**/*.js']
        }
      },
      test: {
        src: ['test/<%= paths.src %>/**/*.js']
      }
    },

    lintspaces: {
      options: {
        newline: true,
        newlineMaximum: 1,
        trailingspaces: true
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= paths.src %>/**/*.js'
        ]
      },
      test: {
        src: [
          'test/**/*.js'
        ]
      }
    },

    jsonlint: {
      src: '<%= paths.test %>/mock/**/*.json'
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
          root: '<%= paths.test %>'
        }
      }
    },
    copy: {
      dist: {
        src: '<%= paths.src %>/moxConfig.js',
        dest: '<%= paths.dist %>/moxConfig.js'
      }
    },
    concat: {
      dist: {
        src: [
          '<%= paths.src %>/**/*.js',
          '!<%= paths.src %>/moxConfig.js'
        ],
        dest: '<%= paths.dist %>/<%= pkg.name %>.js'
      }
    },
    uglify: {
      dist: {
        expand: true,
        cwd: '<%= paths.dist %>/',
        src: ['*.js', '!moxConfig.js'],
        dest: '<%= paths.dist %>',
        ext: '.min.js'
      }
    },
    karma: {
      dist: {
        configFile: 'karma.conf.js'
      }
    },
    watch: {
      karma: {
        files: ['Gruntfile.js', '<%= paths.src %>/**/*.js', '<%= paths.test %>/spec/**/*.js'],
        tasks: ['test']
      }
    },
    bump: {
      options: {
        files: ['package.json', 'bower.json'],
        commitFiles: ['package.json', 'bower.json'],
        commitMessage: 'Bump version to v%VERSION%',
        push: false
      }
    },
    ngdocs: {
      options: {
        dest: '<%= paths.dist %>/docs',
        scripts: [
          'angular.js',
          'dist/mox.js'
        ],
        html5Mode: false,
        bestMatch: true,
        title: 'Mox'
      },
      all: {
        title: 'Documentation',
        src: 'src/**/*.js'
      }
    }
  });

  grunt.registerTask('build', ['clean:dist', 'test', 'copy', 'concat', 'uglify']);
  grunt.registerTask('test', ['jscs', 'jshint', 'lintspaces', 'jsonlint', 'clean:coverage', 'karma', 'coverage']);
  grunt.registerTask('docs', ['clean:docs', 'ngdocs']);
  grunt.registerTask('default', ['build']);

};
