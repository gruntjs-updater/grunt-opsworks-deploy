# grunt-opsworks-deploy

This module provides a way for you to execute deploy commands on an OpsWorks stack and wait for them to complete.  This can be useful if you need to perform multiple deployment commands (for example if you want to update your custom cookbooks as well as running setup on your stack).  

> To review what can be accomplished via the `CreateDeployment` service call, you can view the [SDK documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/OpsWorks.html#createDeployment-property).

## Getting Started

To get started with the `grunt-opsworks-deploy` plugin, you simply need to install the plugin via npm (as seen below): 

```
npm install grunt-opsworks-deploy
```

### Options

The following options allow for configuration of the task.  Some values (such as `command` and `credentials`) are required while others are optional.

#### command

Type: `String`
Required: `true`

The command allows you to specify which deployment action you want to perform.  To simply deploy your application, you can use the `deploy` command.  However, you can also perform other tasks such as `update_custom_cookbooks`.  

> To see more about the values that are allowed for the command value, review the details for the [CreateDeployment](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/OpsWorks.html#createDeployment-property) service call.

```javascript
grunt.initConfig({
	cfg: {
		aws: grunt.file.readJSON('aws-config.json'),
		opsworks: {
    		stackId: 'b460a65d-d703-4e68-a452-651370a05560',
    		appId: 'ca46b3e2-a66b-4e58-b51f-40be7c08e96d'
	  	}
	},
	opsworks_deploy: {
  		options: {
    		credentials: {
      			accessKeyId: '<%= cfg.aws.AWSAccessKeyId %>',
      			secretAccessKey: '<%= cfg.aws.AWSSecretKey %>',
      			region: 'us-east-1'
    		},
    		deploymentCheckInterval: 10000
  		},
		deploy: {
			stackId: '<%= cfg.opsworks.stackId %>',
			appId: '<%= cfg.opsworks.appId %>',
			command: 'deploy'
		}
	}
});
```

### credentials

Type: `Object`
Required: `true`

You will need to include a credentials object in your configuration.  Two values are mandatory: `accessKeyId` and `secretAccessKey`.  There is also a third `region` which defaults to `us-east-1` (but you can set it to whatever you need).

```javascript
opsworks_deploy: {
	deploy: {
		stackId: 'XXXXXXXXXXXXXXXXXXX',
		appId: 'XXXXXXXXXXXXXXXXXXX',
		command: 'deploy',
		credentials: {
			accessKeyId: 'XXXXXXXXXXXXXXX',
			secretAccessKey: 'XXXXXXXXXXXXXXXXXXX',
			region: 'us-east-1'
		}
	}
}
```

### stackId

Type: `String`
Required: `false` (this may depend on the command type)

This is the identifier for your OpsWorks stack.  Depending on your command this may be required.

> Some deployment commands require the `appId` and some require the `stackId`.  Review [this documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/OpsWorks.html#createDeployment-property) to see which is required for your command.

### appId

Type: `String`
Required: `false` (this may depend on the command type)

This is the identifier for the application in your OpsWorks stack.  Depending on your command this may be required.

> Some deployment commands require the `appId` and some require the `stackId`.  Review [this documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/OpsWorks.html#createDeployment-property) to see which is required for your command.

### deploymentCheckInterval

Type: `String`
Default: `15000` (15 Seconds)

After successfully initiating a deployment call, the application will periodically make a service call to determine the state of the deployment.  The interval at which this check occurs is defined by this property (in milliseconds).  It would not be wise to set this value too low (as it would result in a lot of extra service calls).  Unless you have an uncommon use case, just use the default value.

### args

Type: `Object`
Required: `false`

If you need to pass additional args for a specific command, you can do so with this configuration option (for example with the `execute_recipes` command).

The following example illustrates this use case:

```javascript
run_recipes: {
	stackId: '<%= cfg.opsworks.stackId %>',
	appId: '<%= cfg.opsworks.appId %>',
	command: 'execute_recipes',
	args: {
	  recipes: [
	    "deploy::default",
	    "deploy::web"
	  ]
	}
}
```

## Permissions

IAM users who are executing this command need to have permissions for both `opsworks:CreateDeployment` (which is used to kickoff the deployment process) and `opsworks:DescribeDeployments` (which is used to look up the status of the deployment). A sample IAM user policy can be seen below which includes those actions:

```javascript
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1437669898000",
            "Effect": "Allow",
            "Action": [
                "opsworks:DescribeDeployments",
                "opsworks:CreateDeployment"
            ],
            "Resource": [
                "arn:aws:opsworks:*:*:stack/PUT-YOUR-STACK-ID-HERE/"
            ]
        }
    ]
}
```

## Example

The following `Gruntfile.js` illustrates a few sample tasks for the `grunt-opsworks-deploy` plugin:

```javascript
module.exports = function(grunt) {

	'use strict';

	require('load-grunt-tasks')(grunt);
  
	grunt.initConfig({
		cfg: {
	  		aws: grunt.file.readJSON('aws-config.json'),
	  		opsworks: {
	        	stackId: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
	        	appId: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
			}
    	},
		opsworks_deploy: {
			options: {
				credentials: {
					accessKeyId: '<%= cfg.aws.AWSAccessKeyId %>',
					secretAccessKey: '<%= cfg.aws.AWSSecretKey %>',
					region: 'us-east-1'
				}
			},
			deploy: {
				stackId: '<%= cfg.opsworks.stackId %>',
				appId: '<%= cfg.opsworks.appId %>',
				command: 'deploy'
			},
			run_recipes: {
				atackId: '<%= cfg.opsworks.stackId %>',
				appId: '<%= cfg.opsworks.appId %>',
				command: 'execute_recipes',
				args: {
					recipes: [
						"deploy::default",
						"deploy::web"
					]
				}
			},
			update_cookbooks: {
				stackId: '<%= cfg.opsworks.stackId %>',
				appId: '<%= cfg.opsworks.appId %>',
				command: 'update_custom_cookbooks'
			}
		}
	});
};
```