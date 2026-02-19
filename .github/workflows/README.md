# GitHub Secrets Setup

Add these secrets to your GitHub repository:

## 1. AZURE_CREDENTIALS

Run this locally:
```bash
az ad sp create-for-rbac \
  --name "github-actions-seeql" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/YOUR_RG \
  --sdk-auth
```

Copy the JSON output and paste it as `AZURE_CREDENTIALS` secret.

## 2. ACR_NAME
Your container registry name (just the name, not the full URL)
Example: `seeqlregistry123`

## 3. RESOURCE_GROUP
Your resource group name
Example: `seeql-rg`

## How to Add Secrets:

1. Go to your GitHub repo
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each one

## What This Does:

Every time you push to main:
- GitHub builds your Docker image
- Pushes to Azure Container Registry
- Deploys to Azure Container App

No local Docker needed!
