/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for
 * license information.
 */

import * as util from "util";
import axios from "axios";
import { ResourceManagementClient } from "@azure/arm-resources-profile-2020-09-01-hybrid";
import { ClientSecretCredential } from "@azure/identity";

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

const resourceGroupName = "azure-sample-javascript-resourcegroup";

/*
 * Sample for managing resource groups.
 * - Create resource group
 * - Update resource group
 * - List resource groups
 * - Delete resource group
 */
async function main() {
  const metadata = await fetchArmMetadata(config.resourceManagerEndpointUrl);

  const activeDirectoryEndpoint = metadata[0].authentication.loginEndpoint.replace(/\/$/, "");
  const credentialScope = metadata[0].authentication.audiences[0] + "/.default";

  if (activeDirectoryEndpoint.endsWith("adfs")) {
    config.tenantId = "adfs";
  }

  // Create credential using a client secret.
  // Other types of credentials can be used for different authentication techniques.
  const credential = new ClientSecretCredential(config.tenantId, config.clientId, config.clientSecret, {
    authorityHost: activeDirectoryEndpoint
  });

  const clientOptions = {
    credentialScopes: credentialScope,
    endpoint: config.resourceManagerEndpointUrl
  };

  const resourceClient = new ResourceManagementClient(credential, config.subscriptionId, clientOptions);

  try {
    // Create resource group.
    console.log("Creating resource group:", resourceGroupName);

    const created = await resourceClient.resourceGroups.createOrUpdate(resourceGroupName, {
      location: config.location,
      tags: { sampletag: "sampleValue" }
    });

    console.log("Created resource group:\n%s", util.inspect(created, { depth: null }));

    // Update resource group.
    console.log("Updating resource group:", resourceGroupName);

    const updated = await resourceClient.resourceGroups.createOrUpdate(resourceGroupName, {
      location: config.location,
      tags: { sampletag: "helloworld" }
    });

    console.log("Updated resource group:\n%s", util.inspect(updated, { depth: null }));

    // List resource groups.
    console.log("Listing all resource groups");

    let resourceGroupCount = 0;

    for await (const _resourceGroup of resourceClient.resourceGroups.list()) {
      resourceGroupCount++;
    }

    console.log("Found %d resource group(s)", resourceGroupCount);

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
