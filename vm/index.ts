/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See LICENSE in the project root for
 * license information.
 */

import { randomBytes } from "crypto";
import * as util from "util";
import axios from "axios";
import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient } from "@azure/arm-network";
import { ResourceManagementClient } from "@azure/arm-resources";
import { StorageManagementClient } from "@azure/arm-storage";
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

const resourceGroupName = "azure-sample-javascript-vm";
const vmName = "testvm";
const vmSize = "Basic_A0";
const username = "testvmuser";
const password = `Pa5$${randomBytes(32).toString("base64")}`;
const storageAccountName = "vmsamplestorage";
const storageAccountSku = "Standard_LRS";
const vnetName = "testvnet";
const subnetName = "testsubnet";
const publicIPName = "testpip";
const networkInterfaceName = "testnic";
const ipConfigName = "testcrpip";
const domainNameLabel = "testdomainname";
const osDiskName = "testosdisk";
const imagePublisher = "Canonical";
const imageOffer = "UbuntuServer";
const imageSku = "16.04-LTS";

/*
 * Sample for management virtual machines.
 * - Create storage account
 * - Create virtual network
 * - Create public IP
 * - Create network interface
 * - Get virtual machine image
 * - Create virtual machine
 * - Get virtual machine
 * - Stop virtual machine
 * - Start virtual machine
 * - List virtual machines
 * - Delete virtual machine
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

  const computeClient = new ComputeManagementClient(credential, config.subscriptionId, clientOptions);
  const networkClient = new NetworkManagementClient(credential, config.subscriptionId, clientOptions);
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
    console.log("Creating storage account:", storageAccountName);
    
    const sa = await storageClient.storageAccounts.beginCreateAndWait(resourceGroupName, storageAccountName, {
      location: config.location,
      sku: { name: storageAccountSku },
      kind: "Storage",
      tags: { tag1: "val1", tag2: "val2" }
    });

    console.log("Created storage account:\n%s", util.inspect(sa, { depth: null }));

    // Create virtual network.
    console.log("Creating vnet:", vnetName);

    const vnet = await networkClient.virtualNetworks.beginCreateOrUpdateAndWait(resourceGroupName, vnetName, {
      location: config.location,
      addressSpace: { addressPrefixes: ["10.0.0.0/16"] },
      dhcpOptions: { dnsServers: ["10.1.1.1", "10.1.2.4"] },
      subnets: [{ name: subnetName, addressPrefix: "10.0.0.0/24" }]
    });

    console.log("Created vnet:\n%s", util.inspect(vnet, { depth: null }));

    // Create public IP.
    console.log("Creating public IP:", publicIPName);

    const pip = await networkClient.publicIPAddresses.beginCreateOrUpdateAndWait(resourceGroupName, publicIPName, {
      location: config.location,
      publicIPAllocationMethod: "Dynamic",
      dnsSettings: { domainNameLabel: domainNameLabel }
    });

    console.log("Created public IP:\n%s", util.inspect(pip, { depth: null }));

    // Create network interface.
    console.log("Created network interface:", networkInterfaceName);

    const nic = await networkClient.networkInterfaces.beginCreateOrUpdateAndWait(resourceGroupName, networkInterfaceName, {
      location: config.location,
      ipConfigurations: [
        {
          name: ipConfigName,
          privateIPAllocationMethod: "Dynamic",
          subnet: vnet.subnets![0],  // eslint-disable-line @typescript-eslint/no-non-null-assertion
          publicIPAddress: pip
        }
      ]
    });

    console.log("Created network interface:\n%s", util.inspect(vnet, { depth: null }));

    // Get virtual machine image.
    console.log("Finding VM image for location %s from publisher %s with offer %s and sku %s",
      config.location, imagePublisher, imageOffer, imageSku);

    const [vmImage] = await computeClient.virtualMachineImages.list(
      config.location, imagePublisher, imageOffer, imageSku, { top: 1 });

    console.log("Found VM image:\n%s", util.inspect(vmImage, { depth: null }));

    // Create virtual machine.
    console.log("Creating virtual machine:", vmName);

    const vm = await computeClient.virtualMachines.beginCreateOrUpdateAndWait(resourceGroupName, vmName, {
      location: config.location,
      osProfile: {
        computerName: vmName,
        adminUsername: username,
        adminPassword: password
      },
      hardwareProfile: { vmSize: vmSize },
      storageProfile: {
        imageReference: {
          publisher: imagePublisher,
          offer: imageOffer,
          sku: imageSku,
          version: vmImage.name
        },
        osDisk: {
          name: osDiskName,
          caching: "None",
          createOption: "fromImage",
          vhd: { uri: `https://${storageAccountName}.blob.${metadata[0].suffixes.storage}/vhds/${osDiskName}.vhd` }
        },
      },
      networkProfile: {
        networkInterfaces: [{ id: nic.id, primary: true }]
      }
    });

    console.log("Created virtual machine:\n%s", util.inspect(vm, { depth: null }));

    // Get virtual machine.
    console.log("Getting virtual machine:", vmName);

    const foundVm = await computeClient.virtualMachines.get(resourceGroupName, vmName);

    console.log("Got virtual machine %s in state %s", vmName, foundVm.provisioningState);

    // Stop virtual machine.
    console.log("Stopping virtual machine:", vmName);

    await computeClient.virtualMachines.beginPowerOffAndWait(resourceGroupName, vmName);

    console.log("Stopped virtual machine");

    // Start virtual machine.
    console.log("Starting virtual machine:", vmName);

    await computeClient.virtualMachines.beginStartAndWait(resourceGroupName, vmName);

    console.log("Starting virtual machine");

    // List virtual machines.
    let vmCount = 0;

    for await (const _vm of computeClient.virtualMachines.list(resourceGroupName)) {
      vmCount++;
    }

    console.log("Found %d virtual machine(s) in resource group %s", vmCount, resourceGroupName);

    // Delete virtual machine.
    console.log("Deleting virtual machine:", vmName);
  
    await computeClient.virtualMachines.beginDeleteAndWait(resourceGroupName, vmName);

    console.log("Deleted virtual machine");

    // Delete resource group.
    console.log("Deleting resource group:", resourceGroupName);

    await (await resourceClient.resourceGroups.beginDelete(resourceGroupName)).poll();
  } catch (err) {
    console.error("Error occurred in one of the operations.\n%s",
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
