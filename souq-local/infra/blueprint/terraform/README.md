# Terraform — Enterprise Blueprint

## Safety

```bash
# Default plan — MUST show 0 resources when dormant
terraform plan -var-file=environments/staging.tfvars.example
```

`blueprint_enabled = false` → **no Azure resources created**.

## Workspaces

| Workspace | State file | Purpose |
|-----------|------------|---------|
| `margem-enterprise-blueprint` | Isolated | Blueprint only |
| (do not use `default` from `infra/terraform`) | — | Active small-scale stack |

```bash
terraform workspace new margem-enterprise-blueprint
terraform workspace select margem-enterprise-blueprint
```

## Module structure

```
modules/
├── networking/    # VNet, subnets, NSG, NAT, Bastion, Private DNS
├── keyvault/      # Key Vault + private endpoint
├── postgresql/    # Flexible Server HA, private
├── storage/       # Blob GRS, lifecycle, private endpoint
├── monitoring/    # Log Analytics, App Insights, alerts
├── security/      # Defender, Sentinel, Azure Policy
├── aks/           # Kubernetes cluster + spot worker pool
├── appservice/    # Container Apps → AKS bridge
├── apim/          # API Management + policies
├── frontdoor/     # Front Door Premium + WAF
├── redis/         # Azure Cache for Redis
├── servicebus/    # Async job queues
├── search/        # Azure AI Search (optional)
└── ai/            # OpenAI placeholder (dormant)
```

## Enable Phase 1 (example)

```hcl
blueprint_enabled = true
subscription_id   = "your-sub-id"

module_flags = {
  networking = true
  monitoring = true
  keyvault   = true
  postgresql = true
  storage    = true
  security   = true
}
```

## Validation

```bash
terraform init
terraform validate
terraform plan -var-file=environments/staging.tfvars.example
```

## Remote state (production)

```bash
cp backends/remote.backend.hcl.example backends/remote.backend.hcl
# Edit storage account / key — do not commit real backend config if sensitive
terraform init -backend-config=backends/remote.backend.hcl
```

Keep blueprint state **separate** from `infra/terraform` state.

CI and local checks (requires Terraform CLI):

```bash
cd souq-local/infra/blueprint/terraform
terraform init -backend=false
terraform validate
terraform fmt -check
```
