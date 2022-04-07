# hybrid-compute-js-manage-vm

A sample for managing virtual machines on Azure Stack Hub:

- Create storage account
- Create virtual network
- Create public IP
- Create network interface
- Get virtual machine image
- Create virtual machine
- Get virtual machine
- Stop virtual machine
- Start virtual machine
- List virtual machines
- Delete virtual machine

The sample looks to create the following VM. Ensure that is is available or the sample will not run successfully.

| Type              | Value             |
|-------------------|-------------------|
| Publisher         | Canonical         |
| Offer             | UbuntuServer      |
| Sku               | 16.04-LTS         |

To find available virtual machine images, search for "Marketplace Management" in the administrative portal on your Azure Stack Hub. If the virtual machine image above is not available, click on "Add from Azure" to download it.

Alternatively, to use a different virtual machine image, you can edit the virtual machine image constants in `index.ts`:

```typescript
const imagePublisher = "Canonical";
const imageOffer = "UbuntuServer";
const imageSku = "16.04-LTS";
```

For example, if you have the "Windows Server 2016 Datacenter-Pay as you go" marketplace item downloaded, you can set those constants to the following to create a Windows 2016-Datacenter virtual machine:

```typescript
const imagePublisher = "MicrosoftWindowsServer";
const imageOffer = "WindowsServer";
const imageSku = "2016-Datacenter";
```

## Running this Sample

To run this sample:

1. Clone the repository using the following command:

   ```
   $ git clone https://github.com/Azure-Samples/Hybrid-JavaScript-Samples.git
   ```

2. Create an Azure service principal and assign a role to access the subscription. For instructions on creating a service principal in Azure Stack, see [Create a service principal with an application secret](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#option-2-create-a-new-application-secret).

3. Copy the settings file `azureSecretSpConfig.json.dist` to `azureSecretSpConfig.json` and fill in the configuration settings from the service principal.

4. Change directory to sample:

   ```
   $ cd vm
   ```

5. Install dependencies, build the TypeScript source file, then run the sample:

   ```
   $ npm install
   $ npm run build
   $ node .
   ```
## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
