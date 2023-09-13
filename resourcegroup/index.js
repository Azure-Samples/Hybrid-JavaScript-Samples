/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
"use strict";
const Environment = require("@azure/ms-rest-azure-env");
const util = require("util");
const async = require("async");
const msRestAzure = require("@azure/ms-rest-nodeauth");
const ResourceManagementClient = require("@azure/arm-resources-profile-2020-09-01-hybrid").ResourceManagementClient;
const axios = require("axios");
const config = require("../azureSecretSpConfig.json");

const clientIdProp = "clientId";
const clientSecretProp = "clientSecret";
const subscriptionIdProp = "subscriptionId";
const armEndpointProp = "resourceManagerEndpointUrl";
const tenantIdProp = "tenantId";
const locationProp = "location";

_validateConfigVariables();

var clientId = config[clientIdProp];
var clientSecret = config[clientSecretProp];
var subscriptionId = config[subscriptionIdProp];
var armEndpoint = config[armEndpointProp];
var tenantId = config[tenantIdProp];
var location = config[locationProp];
var resourceClient;
var resourceGroupName = "azure-sample-javascript-resourcegroup";
var map = {};

if (armEndpoint.slice(-1) != "/") {
  armEndpoint = armEndpoint + "/";
}
const fetchUrl = armEndpoint + "metadata/endpoints?api-version=2019-10-01";

async function fetchEndpointMetadata() {
  try {
      const response = await axios.get(fetchUrl);
      return response.data;
  } catch (error) {
      console.error(error);
  }
}

function main() {
  var endpointData = fetchEndpointMetadata();
  endpointData.then(function (result) {
    var metadata = result[0];
    console.log("Initialized user details");
    console.log(metadata);
    map["name"] = "AzureStack";
    map["portalUrl"] = metadata.portal;
    map["resourceManagerEndpointUrl"] = armEndpoint;
    map["galleryEndpointUrl"] = metadata.gallery;
    map["activeDirectoryEndpointUrl"] = metadata.authentication.loginEndpoint.slice(0, metadata.authentication.loginEndpoint.lastIndexOf("/") + 1);
    map["activeDirectoryResourceId"] = metadata.authentication.audiences[0];
    map["activeDirectoryGraphResourceId"] = metadata.graph;
    map["storageEndpointSuffix"] = metadata.suffixes.storage;
    map["keyVaultDnsSuffix"] = metadata.suffixes.keyVaultDns;
    map["managementEndpointUrl"] = metadata.authentication.audiences[0];
    var isAdfs = metadata.authentication.loginEndpoint.endsWith("adfs") || metadata.authentication.loginEndpoint.endsWith("adfs/");
    Environment.Environment.add(map);

    var tokenAudience = map["activeDirectoryResourceId"]; 

    var options = {};
    options["environment"] = Environment.Environment.AzureStack;
    options["tokenAudience"] = tokenAudience;

    if(isAdfs) {
      tenantId = "adfs";
      options.environment.validateAuthority = false;
      map["validateAuthority"] = false;
    }

    msRestAzure.loginWithServicePrincipalSecret(clientId, clientSecret, tenantId, options, function (err, credentials) {
      if (err) return console.log(err);
      var clientOptions = {};
      clientOptions["baseUri"] = armEndpoint;
      resourceClient = new ResourceManagementClient(credentials, subscriptionId, clientOptions);

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
          updateResourceGroup(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log(util.format("\nUpdated Resource Groups %s : \n%s",
              resourceGroupName, util.inspect(result, { depth: null })));
            callback(null, result);
          });
        },
      ],
      // Once above operations finish, cleanup and exit.
      function (err) {
        if (err) {
          console.log(util.format("\n??????Error occurred in one of the operations.\n%s",
            util.inspect(err, { depth: null })));
        }
        console.log("\n###### Exit ######");
        console.log(util.format("Please execute the following script for cleanup:\nnode cleanup.js"));
        process.exit();
      });
    });
  }, function (err) {
    console.log(err);
  });
}

main();

// Helper functions
function createResourceGroup(callback) {
  var groupParameters = { location: location, tags: { sampletag: "sampleValue" } };
  console.log("\nCreating resource group: " + resourceGroupName);
  return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
}

function updateResourceGroup(callback) {
  var groupParameters = { location: location, tags: { sampletag: "helloworld" } };
  console.log("\nUpdating resource group: " + resourceGroupName);
  return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
}

function _validateConfigVariables() {
  var missingConfig = [];
  if (!config[clientIdProp]) missingConfig.push(clientIdProp);
  if (!config[clientSecretProp]) missingConfig.push(clientSecretProp);
  if (!config[armEndpointProp]) missingConfig.push(armEndpointProp);
  if (!config[locationProp]) missingConfig.push(locationProp);
  if (!config[subscriptionIdProp]) missingConfig.push(subscriptionIdProp);
  if (!config[tenantIdProp]) missingConfig.push(tenantIdProp);
  if (missingConfig.length > 0) {
    throw new Error(util.format("Please set the following configurations: %s", missingConfig.toString()));
  }
}