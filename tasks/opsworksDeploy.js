var AWS = require('aws-sdk');
var Q = require('q');
var countdown = require('countdown');

/*
  This object represents constants that are used to interact with OpsWorks through
  the AWS SDK.
*/
var opsworksConfig = {
  apiVersion: '2013-02-18',
  namespace: 'OpsWorks',
  method: 'createDeployment',
  checkDeploymentMethod: 'describeDeployments'
};

module.exports = function(grunt) {

  'use strict';

  grunt.registerMultiTask('opsworks_deploy', 'Synchronously execute opsworks deployment commands', function() {

    /*
      This method merges the defined options as well as the defined defaults.
    */
    var mergeOptions = function(context) {
      var options = context.options();
      var mergedCredentials = context.data.credentials || options.credentials;
      if(_.has(context.data, 'credentials') && _.has(options, 'credentials')) {
        mergedCredentials = _.defaults(context.data.credentials, options.credentials);
      }
      var mergedOptions = _.defaults(context.data, options);
      mergedOptions.credentials = mergedCredentials;
      var config = _.defaults(mergedOptions, defaults);
      return config;
    };

    /*
      This method validates the options that are passed into the task.  It will check
      to ensure that there are defined AWS credentials as well as a 'command'.
    */
    var areTaskOptionsValid = function() {
      if(!_.has(taskConfig, 'credentials')) {
        grunt.log.error('You must define a credentials object with your AWS credentials.');
        return false;
      }

      if(!_.has(taskConfig.credentials, 'accessKeyId') && 
        !_.has(taskConfig.credentials, 'secretAccessKey')) {
        grunt.log.error('You must define both an accessKeyId and secretAccessKey in your credentials.');
        return false;
      }

      if(!_.has(taskConfig, 'command')) {
        grunt.log.error('You must define the command you want to execute (for example "deploy" or "setup")');
        return false;
      }

      return true;
    };

    /*
      This method initiates the deployment process.  It calls the 'createDeployment' method
      through the AWS SDK.
    */
    var initiateDeployment = function() {
      var deferred = Q.defer();
      var serviceMethod = service[opsworksConfig.method];

      var params = {
        StackId: taskConfig.stackId,
        AppId: taskConfig.appId,
        Command: {
          Name: taskConfig.command
        }
      };

      grunt.verbose.debug("Params: " + JSON.stringify(params));

      if(_.has(taskConfig, 'args')) {
        params.Command.Args = taskConfig.args;
      }

      serviceMethod.call(service, params, function(err,res) {
        if(err) {
          grunt.log.error(err);
          grunt.fail.warn("Could Not Initiate Deployment");
          deferred.reject(err);
        }

        grunt.verbose.debug("Initiate Deployment Call Complete.  Response: ");
        grunt.verbose.debug(JSON.stringify(res));
        
        grunt.log.ok("Deployment Initiated for Command: " + params.Command.Name.white.bold);
        grunt.log.ok('Monitoring Deployment Status (this may take some time)');

        deploymentId = res.DeploymentId;

        grunt.verbose.writeln();
        grunt.verbose.writeln('Deployment Monitoring Process Beginning');
        grunt.verbose.write('Status will be monitored every ');
        grunt.verbose.write((taskConfig.deploymentCheckInterval / 1000).toString().yellow.bold + ' seconds'.yellow.bold);
        grunt.verbose.writeln();
        grunt.verbose.writeln();

        deferred.resolve();
      });

      return deferred.promise;
    };

    /*
      This method monitors the deployment status of the defined deploymentId which
      is returned from the call to initiate the deployment.  If it detects that the
      deployment is still running, it will use setTimeout to call itself again at the
      configurable 'deploymentCheckInterval'.
    */
    var checkDeploymentStatus = function() {
      return fetchDeploymentStatus()
      .then(function(res) {
        if(res.Status == 'running') {
          grunt.verbose.writeln('>> '.yellow + 'Deployment Check - Deployment Still Running');
          setTimeout(checkDeploymentStatus, taskConfig.deploymentCheckInterval);
        } else {
          grunt.verbose.writeln('>> '.green + "Deployment Status Check Complete");
          reportDeploymentStatus(res);
          done();
        }
      });
    };

    /*
      This method is called from within checkDeploymentStatus to actually get the status
      of a deployment.  It calls the 'describeDeployments' method on the AWS SDK to get
      this status.  It returns a promise and resolves with the object that is returned
      from the AWS SDK describing the deployment.
    */
    var fetchDeploymentStatus = function() {
      var serviceMethod = service[opsworksConfig.checkDeploymentMethod];
      var deferred = Q.defer();

      var params = {
        DeploymentIds: [ deploymentId ]
      };

      serviceMethod.call(service, params, function(err,res) {
        var deployment;

        grunt.verbose.debug("Server Response: " + JSON.stringify(res));

        if(err) {
          grunt.verbose.errorlns(err);
          deferred.reject(err);
        } else {
          deployment = res.Deployments[0];
          deferred.resolve(deployment);
        }

      });

      return deferred.promise;
    };

    /*
      This method reports on the status of the deployment based on the deployment object
      that is returned from the AWS SDK.
    */
    var reportDeploymentStatus = function(deployment) {

      var start = new Date(deployment.CreatedAt);
      var end = new Date(deployment.CompletedAt);
      var duration = (end.getTime() - start.getTime()) / 1000;
      duration = countdown(start, end).toString();

      grunt.verbose.writeln();
      grunt.verbose.writeln('DEPLOYMENT SUMMARY'.yellow);
      grunt.verbose.writeln("Deployment ID: " + deployment.DeploymentId);
      grunt.verbose.writeln("Duration: " + duration);
      grunt.verbose.writeln("Started At: " + deployment.CreatedAt);
      grunt.verbose.writeln("Completed At: " + deployment.CompletedAt);
      grunt.verbose.writeln("Deployment Status: " + 'Successful'.green);

      if(deployment.Status == 'successful') {
        grunt.verbose.writeln();
        grunt.log.ok("Deployment Completed in " + duration);
      } else {
        grunt.log.error("Status: " + 'Failed'.red);
        grunt.fail.warn("AWS OpsWorks reported that the deployment failed.");
      }

    };

    // Setup the options and merge between defined options and defaults

    var _ = grunt.util._;
    var deploymentId = "";
    var done = this.async();
    
    var defaults = {
      deploymentCheckInterval: 15000,
      abortOnFailedDeployment: true,
      credentials: {
        region: 'us-east-1'
      }
    };

    var taskConfig = mergeOptions(this);
    grunt.verbose.writeflags(taskConfig, 'Task Config');

    // Validate Options for the Task

    if(!areTaskOptionsValid()) {
      grunt.fail.fatal('Required arguments not provided');
    }

    grunt.log.ok("Checking that AWS Credentials are Present");

    // Setup the Service for AWS

    var service = function() {
      AWS.config.update(taskConfig.credentials);
      AWS.config.apiVersions[opsworksConfig.namespace] = opsworksConfig.apiVersion;
      AWS.config.logger = {
        log: function(msg) {
          grunt.verbose.debug(msg);
        }
      };
      return new AWS[opsworksConfig.namespace]();
    }();
    
    // Kickoff the Process for Initiating and Monitoring the Deployment

    initiateDeployment()
    .then(checkDeploymentStatus)
    .catch(function(err) {
      grunt.log.error(err);
      done();
    })
    .done();

  });

};
