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
const StorageManagementClient = require("@azure/arm-storage-profile-2020-09-01-hybrid").StorageManagementClient;
const axios = require("axios");

const clientIdEnvName = "AZURE_SP_APP_ID";
const tenantIdEnvName = "AZURE_TENANT_ID";
const secretEnvName = "AZURE_SP_APP_SECRET";
const subscriptionIdEnvName = "AZURE_SUBSCRIPTION_ID";
const armEndpointEnvName = "AZURE_ARM_ENDPOINT";
const locationEnvName = "AZURE_LOCATION";

 _validateEnvironmentVariables();
var clientId = process.env[clientIdEnvName];
var tenantId = process.env[tenantIdEnvName];
var secret = process.env[secretEnvName];
var subscriptionId = process.env[subscriptionIdEnvName];
var armEndpoint = process.env[armEndpointEnvName];
var location = process.env[locationEnvName];
var resourceClient, storageClient;
var accType = "Standard_LRS";
var resourceGroupName = "azure-sample-rg";
var storageAccountName = "teststorage";
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
    msRestAzure.loginWithServicePrincipalSecret(clientId, secret, tenantId, options, function (err, credentials) {
      if (err) return console.log(err);

      resourceClient = new ResourceManagementClient(credentials, subscriptionId);
      storageClient = new StorageManagementClient(credentials, subscriptionId);
      
      async.series([
        function (callback) {
          //Setup
          createResourceGroup(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            callback(null, result);
          });
        },
        function (callback) {
          //Task 1
          createStorageAccount(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log("\nThe created storage account result is: \n" + util.inspect(result, { depth: null }));
            callback(null, result);
          });
        },
        function (callback) {
          //Task 2
          getStorageAccount(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log("\n" + util.inspect(result, { depth: null }));
            callback(null, result);
          });
        },
        function (callback) {
          //Task 3
          listStorageAccountsByResourceGroup(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log("\n" + util.inspect(result, { depth: null }));
            callback(null, result);
          });
        },
        function (callback) {
          //Task 4
          listStorageAccounts(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log("\n" + util.inspect(result, { depth: null }));
            callback(null, result);
          });
        },
        function (callback) {
          //Task 5
          listStorageAccountKeys(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log("\n" + util.inspect(result, { depth: null }));
            callback(null, result);
          });
        },
        function (callback) {
          //Task 6
          regenerateStorageAccountKeys(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log("\n" + util.inspect(result, { depth: null }));
            callback(null, result);
          });
        },
        function (callback) {
          //Task 7
          updateStorageAccount(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log("\nUpdated result is:\n" + util.inspect(result, { depth: null }));
            callback(null, result);
          });
        },
        function (callback) {
          //Task 8
          checkNameAvailability(function (err, result, request, response) {
            if (err) {
              return callback(err);
            }
            console.log("\n" + util.inspect(result, { depth: null }));
            callback(null, result);
          });
        }
  
      ],
        // Once above operations finish, cleanup and exit.
        function (err, results) {
          if (err) {
            console.log(util.format("\n??????Error occurred in one of the operations.\n%s",
              util.inspect(err, { depth: null })));
          }
          console.log("\n###### Exit ######\n");
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

function createStorageAccount(callback) {
  var createParameters = {
    location: location,
    sku: {
      name: accType,
    },
    kind: "Storage",
    tags: {
      tag1: "val1",
      tag2: "val2"
    }
  };
  console.log("\n-->Creating storage account: " + storageAccountName + " with parameters:\n" + util.inspect(createParameters));
  return storageClient.storageAccounts.create(resourceGroupName, storageAccountName, createParameters, callback);
}

function listStorageAccountsByResourceGroup(callback) {
  console.log("\n-->Listing storage accounts in the resourceGroup : " + resourceGroupName);
  return storageClient.storageAccounts.listByResourceGroup(resourceGroupName, callback);
}

function listStorageAccounts(callback) {
  console.log("\n-->Listing storage accounts in the current subscription.");
  return storageClient.storageAccounts.list(callback);
}

function listStorageAccountKeys(callback) {
  console.log("\n-->Listing storage account keys for account: " + storageAccountName);
  return storageClient.storageAccounts.listKeys(resourceGroupName, storageAccountName, callback);
}

function regenerateStorageAccountKeys(callback) {
  console.log("\n-->Regenerating storage account keys for account: " + storageAccountName);
  return storageClient.storageAccounts.regenerateKey(resourceGroupName, storageAccountName, "key1", callback);
}

function getStorageAccount(callback) {
  console.log("\n-->Getting info of storage account: " + storageAccountName);
  return storageClient.storageAccounts.getProperties(resourceGroupName, storageAccountName, callback);
}

function updateStorageAccount(callback) {
  var updateParameters = {
    sku: {
      name: "Standard_LRS"
    }
  };
  console.log("\n-->Updating storage account : " + storageAccountName + " with parameters:\n" + util.inspect(updateParameters));
  return storageClient.storageAccounts.update(resourceGroupName, storageAccountName, updateParameters, callback);
}

function checkNameAvailability(callback) {
  console.log("\n-->Checking if the storage account name : " + storageAccountName + " is available.");
  return storageClient.storageAccounts.checkNameAvailability(storageAccountName, callback);
}

function _validateEnvironmentVariables() {
  var envs = [];
  if (!process.env[clientIdEnvName]) envs.push(clientIdEnvName);
  if (!process.env[armEndpointEnvName]) envs.push(armEndpointEnvName);
  if (!process.env[secretEnvName]) envs.push(secretEnvName);
  if (!process.env[subscriptionIdEnvName]) envs.push(subscriptionIdEnvName);
  if (!process.env[tenantIdEnvName]) envs.push(tenantIdEnvName);
  if (!process.env[locationEnvName]) envs.push(locationEnvName);
  if (envs.length > 0) {
    throw new Error(util.format("please set/export the following environment variables: %s", envs.toString()));
  }
}