var fs = require('vinyl-fs'),
    sass = require('gulp-sass'),
    html2Js = require('gulp-ng-html2js'),
    streamqueue = require('streamqueue'),
    concat = require('gulp-concat')
    minifyHtml = require('gulp-minify-html'),
    uglify = require('gulp-uglify'),
    jshint = require('gulp-jshint'),
    merge = require('merge-stream'),
    cssmin = require('gulp-cssmin');
    
var config = require('./config/sources');

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    nodewebkit: {
      options: {
        app_name: 'Sol',
        build_dir: './dist',
        mac: true,
        win: false
      },
      src: ['./.tmp_build/**/*']
    },

    watch: {
      scripts: {
        files: ['./app/**/*.js'],
        tasks: ['build:scripts']
      },
      templates: {
        files: ['./app/**/*.tpl.html'],
        tasks: ['build:templates']
      },
      styles: {
        files: ['./app/**/*.sass'],
        tasks: ['build:styles']
      },
      nodewebkit: {
        files: ['./app/index.html', './app/package.json'],
        tasks: ['copy:nodewebkit']
      },
      vendor: {
        files: ['./config/sources.js'],
        tasks: ['build:vendor']
      },
      assets: {
        files: ['./app/assets/**/*'],
        tasks: ['copy:assets']
      },
      karma: {
        files: ['app/**/*.js', 'spec/**/*.js'],
        tasks: ['karma:dev:run'] //NOTE the :run flag
      }
    },

    copy: {
      nodewebkit: {
        src: ['index.html', 'package.json'], 
        dest: './build',
        cwd: './app/',
        expand: true
      },
      node_modules: {
        src: ['./node_modules/**/*'],
        dest: './build/',
        cwd: './app',
        expand: true
      },
      assets: {
        src: ['assets/**/*'],
        dest: './build/',
        cwd: './app',
        expand: true
      },
      dev: {
        src: ['./dev.js'],
        dest: './build/dev.js'
      }
    },

    clean: ['./build/**/*'],

    karma: {
      options: {
        configFile: 'karma.conf.js'
      },
      dev: {
        background: true
      },
      continuous: {
        singleRun: true
      }
    }
  });

  grunt.loadNpmTasks('grunt-node-webkit-builder');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-karma');

  grunt.registerTask('build', function () {
    if (grunt.option('target') === 'prod') {
      grunt.task.run('clean');
    }

    grunt.task.run('copy');

    grunt.task.run('build:vendor');
    grunt.task.run('build:styles');
    grunt.task.run('build:scripts');
    grunt.task.run('build:templates');
    

    if (grunt.option('target') !== 'prod') {
      grunt.task.run('karma:dev');
      grunt.task.run('watch');
    } else {
      grunt.task.run('karma:continuous');
      grunt.task.run('nodewebkit');
    }
  });

  /*********************************************************
  *** SASS -> CSS 
  *********************************************************/

  grunt.registerTask('build:styles', function () {
    var task = fs.src('./app/**/*.sass')
      .pipe(sass())
      .pipe(concat('styles.css'));
      
    if (grunt.option('target') === 'prod') {
      task.pipe(cssmin());
    }

    task.pipe(fs.dest('./build'))
    .on('end', this.async());
  });

  /*********************************************************
  *** JAVASCRIPT:USER
  *********************************************************/

  grunt.registerTask('build:scripts', function () {
    var task = fs.src('./app/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(concat('scripts.js'));

    if (grunt.option('target') === 'prod') {
      task.pipe(uglify());
    }

    task.pipe(fs.dest('./build'))
      .on('end', this.async());
  });

  /*********************************************************
  *** VENDOR 
  *********************************************************/

  grunt.registerTask('build:vendor', function () {
    var styles = fs.src(config.styles.vendor)
        .pipe(concat('vendor.css'));

    var scripts = fs.src(config.scripts.vendor)
        .pipe(concat('vendor.js'));
        
    merge(styles, scripts)
      .pipe(fs.dest('./build'))
      .on('end', this.async());
  });

  /*********************************************************
  *** TEMPLATES 
  *********************************************************/

  grunt.registerTask('build:templates', function () {
    var task = fs.src('./app/**/*.tpl.html')
        .pipe(minifyHtml({
          empty: true,
          spare: true,
          quotes: true
        }))
        .pipe(html2Js({
          moduleName: 'templates',
          prefix: '/partials'
        }))
        .pipe(concat('partials.js'));

    if (grunt.option('target') === 'prod') {
      task.pipe(uglify());
    }

    task.pipe(fs.dest('./build'))
      .on('end', this.async());
  });
};