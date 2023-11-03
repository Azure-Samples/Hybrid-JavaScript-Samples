/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for
 * license information.
 */

import * as util from "util";
import axios from "axios";
import { KeyVaultManagementClient } from "@azure/arm-keyvault";
import { ResourceManagementClient } from "@azure/arm-resources";
import { ClientSecretCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const azureSecretSpConfig = require("../azureSecretSpConfig.json");

const config = {
  clientId: azureSecretSpConfig["clientId"] as string,
  clientSecret: azureSecretSpConfig["clientSecret"] as string,
  objectId: azureSecretSpConfig["objectId"] as string,
  subscriptionId: azureSecretSpConfig["subscriptionId"] as string,
  resourceManagerEndpointUrl: azureSecretSpConfig["resourceManagerEndpointUrl"] as string,
  tenantId: azureSecretSpConfig["tenantId"] as string,
  location: azureSecretSpConfig["location"] as string,
};

const missingConfigs = Object.entries(config)
  .filter(([_key, value]) => !value)
  .map(([key, _value]) => key);

if (missingConfigs.length > 0) {
  throw new Error(`Please set the following configuration values: ${missingConfigs}`);
}

const resourceGroupName = "azure-sample-javascript-secret";
const keyVaultName = "azure-sample-kv";
const secretName = "azure-app-created-secret";
const secretValue = "azure-app-created-password";

/*
 * Sample for managing secrets.
 * - Create key vault
 * - Set secret
 * - Get secret
 * - Delete key vault
 */
async function main() {
  const metadata = await fetchArmMetadata(config.resourceManagerEndpointUrl);

  const activeDirectoryEndpoint = metadata[0].authentication.loginEndpoint.replace(/\/$/, "");
  const credentialScope = metadata[0].authentication.audiences[0] + "/.default";
  const credentialTenantId = activeDirectoryEndpoint.endsWith("adfs") ? "adfs" : config.tenantId;

  // Create credential using a client secret.
  // Other types of credentials can be used for different authentication techniques.
  const credential = new ClientSecretCredential(credentialTenantId, config.clientId, config.clientSecret, {
    authorityHost: activeDirectoryEndpoint,
    disableInstanceDiscovery: true
  });

  const clientOptions = {
    credentialScopes: credentialScope,
    endpoint: config.resourceManagerEndpointUrl
  };

  const resourceClient = new ResourceManagementClient(credential, config.subscriptionId, clientOptions);
  const keyVaultClient = new KeyVaultManagementClient(credential, config.subscriptionId, clientOptions);

  try {
    // Create resource group.
    console.log("Creating resource group:", resourceGroupName);

    await resourceClient.resourceGroups.createOrUpdate(resourceGroupName, {
      location: config.location,
      tags: { sampletag: "sampleValue" }
    });

    console.log("Created resource group");

    // Create key vault.
    console.log("Creating key vault:", resourceGroupName);

    const vault = await keyVaultClient.vaults.beginCreateOrUpdateAndWait(resourceGroupName, keyVaultName, {
      location: config.location,
      properties: {
        sku: { family: "A", name: "standard" },
        accessPolicies: [
          {
            tenantId: config.tenantId,
            objectId: config.objectId,
            permissions: { secrets: ["all"] }
          }
        ],
        enabledForDeployment: false,
        tenantId: config.tenantId
      },
      tags: {}
    });

    console.log("Created key vault:\n%s", util.inspect(vault, { depth: null }));

    // Set secret.
    // Using the secret client (data plane) for set and get operations.
    const keyVaultUrl = `https://${keyVaultName}.${metadata[0].suffixes.keyVaultDns}`;
    const secretClient = new SecretClient(keyVaultUrl, credential, { serviceVersion: "7.1", disableChallengeResourceVerification: true});

    console.log("Setting a secret with name:", secretName, "and value:", secretValue);

    await secretClient.setSecret(secretName, secretValue);

    console.log("Set the secret:", secretName);

    // Get secret.
    console.log("Getting the secret:", secretName);

    const secret = await secretClient.getSecret(secretName);

    console.log("Got the secret:", secretName, "with value:", secret.value);

    // Delete key vault.
    console.log("Deleting key vault:", keyVaultName);

    await keyVaultClient.vaults.delete(resourceGroupName, keyVaultName);

    console.log("Deleted key vault");

    // Delete resource group.
    console.log("Deleting resource group:", resourceGroupName);

    await (await resourceClient.resourceGroups.beginDelete(resourceGroupName)).poll();
  } catch (err) {
    console.error("Error occurred in one of the operations\n%s",
      util.inspect(err, { depth: null }));

    try {
      console.log("Attempting to delete resource group:", resourceGroupName);

      await (await resourceClient.resourceGroups.beginDelete(resourceGroupName)).poll();
    } catch (err) {
      console.error("Error occurred while deleting resource group\n%s",
        util.inspect(err, { depth: null }));
    }

    process.exit(1);
  }
}

// Metadata response detailing authentication, endpoints, and service DNS suffixes.
interface ArmMetadata {
  name: string;
  authentication: {
    loginEndpoint: string;
    audiences: string[];
  };
  portal: string;
  graphAudience: string;
  graph: string;
  gallery: string;
  suffixes: {
    keyVaultDns: string;
    storage: string;
  };
}

// Retreive ARM metadata from the metadata endpoint.
async function fetchArmMetadata(armEndpoint: string): Promise<ArmMetadata[]> {
  const fetchUrl = `${armEndpoint.replace(/\/$/, "")}/metadata/endpoints?api-version=2019-10-01`;

  try {
    const response = await axios.get(fetchUrl);
    return response.data;
  } catch (err) {
    console.error("Encountered an error while fetching ARM metadata:\n%s", err);
    process.exit(1);
  }
}

main();
