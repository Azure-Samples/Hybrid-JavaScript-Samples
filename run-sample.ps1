# Run the SDK samples
Write-Host "Running resource group sample..."
Push-Location "${PSScriptRoot}\resourcegroup\"
npm ci
Write-Host "Running index.js"
node "index.js"
Write-Host "Running cleanup.js"
node "cleanup.js"
Pop-Location