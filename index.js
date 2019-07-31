/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
'use strict';
var Environment = require("@azure/ms-rest-azure-env");
var util = require('util');
var async = require('async');
var msRestAzure = require('@azure/ms-rest-nodeauth');
var ResourceManagementClient = require('@azure/arm-resources-profile-hybrid-2019-03-01').ResourceManagementClient;
const request = require('request');
const https = require('https');
const fetch = require("node-fetch");
const requestPromise = util.promisify(request);

_validateEnvironmentVariables();
var clientId = process.env['AZURE_CLIENT_ID'];
var secret = process.env['AZURE_CLIENT_SECRET'];
var subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
var base_url = process.env['ARM_ENDPOINT'];
var tenantId = process.env['AZURE_TENANT_ID'];
var resourceClient; //keyvaultClient;
//Sample Config
var randomIds = {};
var location = 'westus2';
var resourceGroupName = _generateRandomId('testrg', randomIds);
var resourceName = _generateRandomId('testresource', randomIds);

// create a map
var map = {};
const fetchUrl = base_url + 'metadata/endpoints?api-version=1.0'

function initialize() {
  // Setting URL and headers for request
  var options = {
    url: fetchUrl,
    headers: {
      'User-Agent': 'request'
    },
    rejectUnauthorized: false
  };
  // Return new promise 
  return new Promise(function (resolve, reject) {
    // Do async job
    request.get(options, function (err, resp, body) {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(body));
      }
    })
  })

}

function main() {
  var initializePromise = initialize();
  initializePromise.then(function (result) {
    var userDetails = result;
    console.log("Initialized user details");
    // Use user details from here
    console.log(userDetails)
    map["name"] = "AzureStack"
    map["portalUrl"] = userDetails.portalEndpoint
    map["resourceManagerEndpointUrl"] = base_url
    map["galleryEndpointUrl"] = userDetails.galleryEndpoint
    map["activeDirectoryEndpointUrl"] = userDetails.authentication.loginEndpoint.slice(0, userDetails.authentication.loginEndpoint.lastIndexOf("/") + 1)
    map["activeDirectoryResourceId"] = userDetails.authentication.audiences[0]
    map["activeDirectoryGraphResourceId"] = userDetails.graphEndpoint
    map["storageEndpointSuffix"] = "." + base_url.substring(base_url.indexOf('.'))
    map["keyVaultDnsSuffix"] = ".vault" + base_url.substring(base_url.indexOf('.'))
    map["managementEndpointUrl"] = userDetails.authentication.audiences[0]
    map["validateAuthority"] = "false"
    Environment.Environment.add(map);

    var tokenAudience = map["activeDirectoryResourceId"] 

    var options = {};
    options["environment"] = Environment.Environment.AzureStack;
    options["tokenAudience"] = tokenAudience;

    ///////////////////////////////////////
    //Entrypoint for the sample script   //
    ///////////////////////////////////////

    msRestAzure.loginWithServicePrincipalSecret(clientId, secret, tenantId, options, function (err, credentials) {
      if (err) return console.log(err);
      var clientOptions = {};
      clientOptions["baseUri"] = base_url;
      resourceClient = new ResourceManagementClient(credentials, subscriptionId, clientOptions);

      // Work flow of this sample:
      // 1. create a resource group 
      // 2. list resource groups
      // 3. update a resource group
      // 4. create a key vault resource in the resource group
      // 5. get details for a given resource
      // 6. export the resource group template
      // 7. delete a resource(optional)
      // 8. delete a resource group(optional)

      async.series([
        function (callback) {
          //Task 1
          createResourceGroup(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            callback(null, result);
          });
        },
        function (callback) {
          //Task 2
          listResourceGroups(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log(util.format('\nResource Groups in subscription %s : \n%s',
              subscriptionId, util.inspect(result, { depth: null })));
            callback(null, result);
          });
        },
        function (callback) {
          //Task 3
          updateResourceGroup(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log(util.format('\nUpdated Resource Groups %s : \n%s',
              resourceGroupName, util.inspect(result, { depth: null })));
            callback(null, result);
          });
        },
      
        function (callback) {
          //Task 6
          exportResourceGroupTemplate(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log(util.format('\nResource group template: \n%s',
              util.inspect(result, { depth: null })));
            callback(null, result);
          });
        }
      ],
        // Once above operations finish, cleanup and exit.
        function (err, results) {
          if (err) {
            console.log(util.format('\n??????Error occurred in one of the operations.\n%s',
              util.inspect(err, { depth: null })));
          } else {
            //console.log(util.format('\n######You can browse the website at: https://%s.', results[4].enabledHostNames[0]));
          }
          console.log('\n###### Exit ######');
          console.log(util.format('Please execute the following script for cleanup:\nnode cleanup.js %s %s', resourceGroupName, resourceName));
          process.exit();
        });
    });
  }, function (err) {
    console.log(err);
  })
}

main();

    // Helper functions
    function createResourceGroup(callback) {
      var groupParameters = { location: location, tags: { sampletag: 'sampleValue' } };
      console.log('\nCreating resource group: ' + resourceGroupName);
      return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
    }

    function listResourceGroups(callback) {
      console.log('\nListing all resource groups: ');
      return resourceClient.resourceGroups.list(callback);
    }

    function updateResourceGroup(callback) {
      var groupParameters = { location: location, tags: { sampletag: 'helloworld' } };
      console.log('\nUpdating resource group: ' + resourceGroupName);
      return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
    }
    
    function exportResourceGroupTemplate(callback) {
      var rgParameter = {
        resources: ['*']
      };
      console.log(util.format('\nExporting resource group template: %s'), resourceGroupName);
      return resourceClient.resourceGroups.exportTemplate(resourceGroupName, rgParameter, callback);
    }

    function deleteResource(callback) {
      console.log(util.format('\nDeleting resource %s in resource group %s'),
        resourceName, resourceGroupName);
      return resourceClient.resources.deleteMethod(resourceGroupName,
        resourceProviderNamespace,
        parentResourcePath,
        resourceType,
        resourceName,
        apiVersion,
        callback);
    }

    function deleteResourceGroup(callback) {
      console.log('\nDeleting resource group: ' + resourceGroupName);
      return resourceClient.resourceGroups.deleteMethod(resourceGroupName, callback);
    }

    function _validateEnvironmentVariables() {
      var envs = [];
      if (!process.env['CLIENT_ID']) envs.push('CLIENT_ID');
      if (!process.env['ARM_ENDPOINT']) envs.push('ARM_ENDPOINT');
      if (!process.env['APPLICATION_SECRET']) envs.push('APPLICATION_SECRET');
      if (!process.env['AZURE_SUBSCRIPTION_ID']) envs.push('AZURE_SUBSCRIPTION_ID');
      if (!process.env['DOMAIN']) envs.push('DOMAIN');
      if (!process.env['TENANT_ID']) envs.push('TENANT_ID');
      if (envs.length > 0) {
        throw new Error(util.format('please set/export the following environment variables: %s', envs.toString()));
      }
    }

    function _generateRandomId(prefix, exsitIds) {
      var newNumber;
      while (true) {
        newNumber = prefix + Math.floor(Math.random() * 10000);
        if (!exsitIds || !(newNumber in exsitIds)) {
          break;
        }
      }
      return newNumber;
    }