# Official Microsoft Sample

<!-- 
Guidelines on README format: https://review.docs.microsoft.com/help/onboard/admin/samples/concepts/readme-template?branch=master

Guidance on onboarding samples to docs.microsoft.com/samples: https://review.docs.microsoft.com/help/onboard/admin/samples/process/onboarding?branch=master

Taxonomies for products and languages: https://review.docs.microsoft.com/new-hope/information-architecture/metadata/taxonomies?branch=master
-->

A sample code to create a virtual machine in Azure.

## Contents

| File/folder       | Description                                |
|-------------------|--------------------------------------------|
| `index.js`        | Sample source code.                        |
| `.gitignore`      | Define what to ignore at commit time.      |
| `package.json`    | Define dependencies.                       |
| `README.md`       | This README file.                          |
| `LICENSE`         | The license for the sample.                |

## Prerequisites

Refer to this azure stack doc for prerequisites link: https://docs.microsoft.com/en-us/azure-stack/user/azure-stack-version-profile-nodejs.

### Virtual Machine

The sample currently looks to create the following VM. Make sure it is available or the sample will fail.

| Type              | Value                                                 |
|-----------------------|-------------------------------------------------------------|
| PublisherName       | canonical                            |
| Offer       | UbuntuServer                        |
| Sku           | 16.04-LTS                                   |

Alternatively, simply go into the `index.js` and change the values to match a virtual machine that you have available in your Azure Stack environment.

```javascript
// Ubuntu config
var publisher = 'Canonical';
var offer = 'UbuntuServer';
var sku = '16.04-LTS';
```

To find available virtual machines, search for `Marketplace management` in the Azure Stack portal. If no virtual machines are available, click on `Add from Azure` to download a new one.

For example, if you have `Windows Server 2016 Datacenter-Pay as you go` marketplace item, you can set those variables to the following to create a Windows 2016-Datacenter virtual machine:

```javascript
// Windows config
var publisher = 'MicrosoftWindowsServer';
var offer = 'WindowsServer';
var sku = '2016-Datacenter';
```

## Running the sample

From root folder
```
npm install
node .\index.js <VM Username> <VM Password>
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
