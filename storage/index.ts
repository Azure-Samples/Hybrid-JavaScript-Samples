/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for
 * license information.
 */

import * as util from "util";
import axios from "axios";
import { ResourceManagementClient } from "@azure/arm-resources-profile-2020-09-01-hybrid";
import { StorageManagementClient } from "@azure/arm-storage-profile-2020-09-01-hybrid";
import { ClientSecretCredential } from "@azure/identity";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

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

const resourceGroupName = "azure-sample-javascript-storage";
const storageAccountName = "storagesamplestorage";
const storageAccountSku = "Standard_LRS";
const blobContainerName = "sampleblobcontainer";
const blobName = "sampleblob";

/*
 * Sample for managing storage accounts.
 * - Create storage account
 * - Get storage account
 * - List storage accounts
 * - List storage account keys
 * - Create a blob container
 * - Upload a blob
 * - Download a blob
 * - Regenerate storage account keys
 * - Check storage account name availability
 * - Delete storage account
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
  const storageClient = new StorageManagementClient(credential, config.subscriptionId, clientOptions);

  try {
    // Create resource group.
    console.log("Creating resource group:", resourceGroupName);

    await resourceClient.resourceGroups.createOrUpdate(resourceGroupName, {
      location: config.location,
      tags: { sampletag: "sampleValue" }
    });

    console.log("Created resource group");

    // Create storage account.
    console.log("Creating storage account");

    const sa = await storageClient.storageAccounts.beginCreateAndWait(resourceGroupName, storageAccountName, {
      location: config.location,
      sku: { name: storageAccountSku },
      kind: "Storage",
      tags: { tag1: "val1", tag2: "val2" }
    });

    console.log("Created storage account:\n%s", util.inspect(sa, { depth: null }));

    // Get storage account.
    const foundSa = await storageClient.storageAccounts.getProperties(resourceGroupName, storageAccountName);

    console.log("Got storage account %s in state %s", storageAccountName, foundSa.provisioningState);

    // List storage accounts.
    let saCount = 0;

    for await (const _sa of storageClient.storageAccounts.listByResourceGroup(resourceGroupName)) {
      saCount++;
    }

    console.log("Found %d storage accounts(s) in resource group %s", saCount, resourceGroupName);

    // List storage account keys.
    console.log("Listing keys for storage account:", storageAccountName);

    const keysResult = await storageClient.storageAccounts.listKeys(resourceGroupName, storageAccountName);

    console.log("Listed %d key(s) for storage account", keysResult.keys.length);

    // Create a blob container.
    // Using the blob service client (data plane) for blob operations.
    // Authentication is done by the keys listed above, but you can also use the
    // credential from @azure/identity as well!
    const blobUrl = `https://${storageAccountName}.blob.${metadata[0].suffixes.storage}`;
    const sharedKeyCredential = new StorageSharedKeyCredential(storageAccountName, keysResult.keys[1].value);
    const blobServiceClient = new BlobServiceClient(blobUrl, sharedKeyCredential);
    const containerClient = blobServiceClient.getContainerClient(blobContainerName);

    
    await blobServiceClient.setProperties({ defaultServiceVersion: "2019-07-07" });

    console.log("Creating blob container:", blobContainerName);

    await containerClient.create();
  
    console.log("Created blob container");

    // Upload a blob.
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const content = "Hello, world!";

    console.log("Uploading block blob:", blobName);

    await blockBlobClient.upload(content, content.length);

    console.log("Uploaded block blob");

    // Download a blob.
    // This requires downloading the entire readable stream and converting it to
    // a string chunk-by-chunk.
    console.log("Downloading block blob:", blobName);

    const blobResponse = await blockBlobClient.download();

    const blob = await new Promise((resolve, reject) => {
      const chunks = [];

      blobResponse.readableStreamBody
        .on("data", data => chunks.push(data instanceof Buffer ? data : Buffer.from(data)))
        .on("end", () => resolve(Buffer.concat(chunks)))
        .on("error", reject);
    });

    console.log("Downloaded block blob:", blobName, "with content:", blob.toString());

    // Regenerate storage account keys.
    console.log("Regenerating keys for storage account:", storageAccountName);

    await storageClient.storageAccounts.regenerateKey(resourceGroupName, storageAccountName, { keyName: "key1" });

    console.log("Regenerated storage account keys");

    // Check storage account name availability.
    console.log("Checking availablity of storage account name:", storageAccountName);

    const availability = await storageClient.storageAccounts.checkNameAvailability({
      name: storageAccountName,
      type: "Microsoft.Storage/storageAccounts",
    });

    if (availability.nameAvailable) {
      console.log("Storage account name is available");
    } else {
      console.log("Storage account name is not available");
    }

    // Delete storage account.
    console.log("Deleting storage account:", storageAccountName);

    await storageClient.storageAccounts.delete(resourceGroupName, storageAccountName);

    console.log("Deleted storage account");

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
