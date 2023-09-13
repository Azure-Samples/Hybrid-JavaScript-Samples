/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
"use strict";

const Environment = require("@azure/ms-rest-azure-env");
const util = require("util");
const msRestAzure = require("@azure/ms-rest-nodeauth");
const ResourceManagementClient = require("@azure/arm-resources-profile-2020-09-01-hybrid").ResourceManagementClient;
const StorageManagementClient = require("@azure/arm-storage-profile-2020-09-01-hybrid").StorageManagementClient;
const axios = require("axios");
const config = require("../azureAppSpConfig.json");

const clientIdProp = "clientId";
const clientSecretProp = "clientSecret";
const subscriptionIdProp = "subscriptionId";
const armEndpointProp = "resourceManagerUrl";
const tenantIdProp = "tenantId";

_validateEnvironmentVariables();

var clientId = config[clientIdProp];
var tenantId = config[tenantIdProp];
var secret = config[clientSecretProp];
var subscriptionId = config[subscriptionIdProp];
var armEndpoint = config[armEndpointProp];
var resourceGroupName = "azure-sample-rg";
var storageAccountName = "teststorage";
var resourceClient, storageClient;
var map = {};

if (armEndpoint.slice(-1) != "/") {
  armEndpoint = armEndpoint + "/";
}
const fetchUrl = armEndpoint + "metadata/endpoints?api-version=2019-10-01";

function deleteStorageAccount(callback) {
  console.log("\nDeleting storage account: " + storageAccountName);
  return storageClient.storageAccounts.deleteMethod(resourceGroupName, storageAccountName, callback);
}

function deleteResourceGroup(callback) {
  console.log("\nDeleting resource group: " + resourceGroupName);
  return resourceClient.resourceGroups.deleteMethod(resourceGroupName, callback);
}

function _validateEnvironmentVariables() {
  var missingConfig = [];
  if (!config[clientIdProp]) missingConfig.push(clientIdProp);
  if (!config[tenantIdProp]) missingConfig.push(tenantIdProp);
  if (!config[armEndpointProp]) missingConfig.push(armEndpointProp);
  if (!config[clientSecretProp]) missingConfig.push(clientSecretProp);
  if (!config[subscriptionIdProp]) missingConfig.push(subscriptionIdProp);
  if (missingConfig.length > 0) {
    throw new Error(util.format("Please set the following configurations: %s", missingConfig.toString()));
  }
}

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

      deleteStorageAccount(function (err, result) {
        if (err) return console.log("Error occured in deleting the storage account: " + storageAccountName + "\n" + util.inspect(err, { depth: null }));
        console.log("Successfully deleted storage account: " + storageAccountName);
        deleteResourceGroup(function (err, result) {
          if (err) return console.log("Error occured in deleting the resource group: " + resourceGroupName + "\n" + util.inspect(err, { depth: null }));
        });
      });
    });
  }, function (err) {
    console.log(err);
  });
}

main();