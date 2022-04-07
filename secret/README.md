# hybrid-keyvault-js-manage-secret

A sample for managing secrets on Azure Stack Hub:

- Create key vault
- Set secret
- Get secret
- Delete key vault

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
   $ cd secret
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
