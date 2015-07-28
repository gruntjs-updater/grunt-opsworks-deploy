module.exports = function(grunt) {

  'use strict';

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      dev: [
        'tasks/*.js',
        'Gruntfile.js'
      ]
    },
    watch: {
      dev: {
        files: [
          'tasks/*.js',
          'Gruntfile.js'
        ],
        tasks: [
          'jshint:dev'
        ]
      }
    }
  });

};