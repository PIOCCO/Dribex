export type CloudProvider = "Azure" | "AWS" | "GCP" | "Self-hosted";
export type Difficulty = "Starter" | "Intermediate" | "Advanced" | "Enterprise";
export type BlueprintCategory =
  | "Azure cloud architectures"
  | "Docker deployment stacks"
  | "CI/CD infrastructure"
  | "Monitoring stacks"
  | "Security / SOC"
  | "Business continuity / DR"
  | "FinOps / cost control"
  | "Private AI / RAG"
  | "Kubernetes"
  | "Production SaaS"
  | "Agency platforms";

export type Blueprint = {
  slug: string;
  name: string;
  tagline: string;
  category: BlueprintCategory;
  clouds: CloudProvider[];
  technologies: string[];
  difficulty: Difficulty;
  deploymentHours: number;
  priceUsd: number;
  featured?: boolean;
  popular?: boolean;
  problem: string;
  audience: string[];
  features: string[];
  components: string[];
  requirements: string[];
  deploymentSteps: string[];
  securityNotes: string[];
  included: string[];
  version: string;
  changelog: string;
  useCases: string[];
};

export const BLUEPRINT_CATEGORIES: BlueprintCategory[] = [
  "Azure cloud architectures",
  "Docker deployment stacks",
  "CI/CD infrastructure",
  "Monitoring stacks",
  "Security / SOC",
  "Business continuity / DR",
  "FinOps / cost control",
  "Private AI / RAG",
  "Kubernetes",
  "Production SaaS",
  "Agency platforms",
];

export const blueprints: Blueprint[] = [
  {
    slug: "azure-enterprise-foundation",
    name: "Azure Enterprise Landing Zone",
    tagline: "Hub-spoke networking, identity, and guardrails for regulated teams.",
    category: "Azure cloud architectures",
    clouds: ["Azure"],
    technologies: ["Terraform", "Azure Policy", "Private Link", "Entra ID"],
    difficulty: "Enterprise",
    deploymentHours: 24,
    priceUsd: 2490,
    featured: true,
    popular: true,
    problem: "Teams outgrow ad-hoc subscriptions and need repeatable, auditable Azure foundations.",
    audience: ["Platform engineering", "Cloud architects", "Regulated SaaS"],
    features: ["Hub-spoke VNet", "Centralized logging", "Key Vault baseline", "Policy-as-code"],
    components: ["VNet", "Firewall", "Log Analytics", "Key Vault", "RBAC roles"],
    requirements: ["Azure subscription", "Terraform 1.5+", "Break-glass admin group"],
    deploymentSteps: [
      "Configure remote state and service principal",
      "Apply networking module",
      "Enable monitoring and policy sets",
      "Validate private endpoints",
    ],
    securityNotes: ["No secrets in Git", "Private endpoints default", "Defender plans documented"],
    included: ["Terraform modules", "Runbooks", "Architecture diagrams", "Cost estimate sheet"],
    version: "2.4.0",
    changelog: "Added Private Link patterns for PostgreSQL and Storage.",
    useCases: ["Multi-team SaaS", "Enterprise migration", "ISV on Azure"],
  },
  {
    slug: "docker-production-stack",
    name: "Docker Production Stack",
    tagline: "Internal-network Compose with nginx edge, observability, and backup hooks.",
    category: "Docker deployment stacks",
    clouds: ["Self-hosted"],
    technologies: ["Docker Compose", "nginx", "Prometheus", "Loki", "PostgreSQL"],
    difficulty: "Intermediate",
    deploymentHours: 8,
    priceUsd: 890,
    featured: true,
    popular: true,
    problem: "Ship a VPS-ready production stack without Kubernetes overhead.",
    audience: ["Startups", "Agencies", "On-prem first adopters"],
    features: ["Single edge entry", "Internal DB/cache", "Backup scripts", "Health gates"],
    components: ["nginx", "API", "Postgres", "Redis", "Grafana stack"],
    requirements: ["Ubuntu 22.04+", "Docker Engine", "Domain + TLS"],
    deploymentSteps: ["Prepare .env.prod", "Run deploy script", "Replace bootstrap TLS", "Verify /ready"],
    securityNotes: ["Only 443 public", "Vault bootstrap documented", "DOCKER-USER hardening optional"],
    included: ["Compose files", "nginx config", "Deploy/restore scripts", "REBRANDING guide"],
    version: "1.2.0",
    changelog: "Canonical production-deploy path with Alembic step.",
    useCases: ["B2B SaaS MVP", "Internal tools", "Staged Azure migration"],
  },
  {
    slug: "github-azure-cicd",
    name: "GitHub → Azure CI/CD Pipeline",
    tagline: "Security-gated builds, container scan, and progressive deploy to Container Apps.",
    category: "CI/CD infrastructure",
    clouds: ["Azure"],
    technologies: ["GitHub Actions", "Trivy", "ACR", "Container Apps"],
    difficulty: "Advanced",
    deploymentHours: 12,
    priceUsd: 1290,
    featured: true,
    problem: "Manual releases and missing security gates block enterprise sales.",
    audience: ["DevOps leads", "Backend teams"],
    features: ["SAST gate", "Image signing hook", "Environment promotion", "Rollback job"],
    components: ["Workflow templates", "OIDC federated creds", "Deployment slots"],
    requirements: ["GitHub org", "Azure Container Apps", "ACR"],
    deploymentSteps: ["Wire OIDC", "Import workflows", "Configure secrets", "Run staging deploy"],
    securityNotes: ["Least-privilege SP", "Branch protection required", "Secret scanning enabled"],
    included: ["Workflow YAML", "Setup doc", "Failure playbooks"],
    version: "1.0.3",
    changelog: "Added supply-chain attestation placeholder step.",
    useCases: ["API services", "Microservices", "Multi-env SaaS"],
  },
  {
    slug: "observability-slo-stack",
    name: "SLO Observability Stack",
    tagline: "Metrics, logs, traces, and error budgets for production APIs.",
    category: "Monitoring stacks",
    clouds: ["Azure", "Self-hosted"],
    technologies: ["Prometheus", "Grafana", "Loki", "OpenTelemetry", "Alertmanager"],
    difficulty: "Intermediate",
    deploymentHours: 10,
    priceUsd: 990,
    popular: true,
    problem: "Teams react to outages instead of measuring reliability.",
    audience: ["SRE", "Backend engineers"],
    features: ["Golden signals dashboards", "SLO burn alerts", "Log correlation", "On-call runbooks"],
    components: ["Prometheus", "Grafana", "Loki", "OTel collector"],
    requirements: ["Metrics endpoint on API", "Notification channel"],
    deploymentSteps: ["Deploy stack", "Scrape targets", "Import dashboards", "Tune alert routes"],
    securityNotes: ["Internal-only Grafana", "No public Prometheus ports"],
    included: ["Dashboards JSON", "Alert rules", "SLO worksheet"],
    version: "3.1.0",
    changelog: "Added API latency SLO templates.",
    useCases: ["FastAPI", "Node APIs", "Hybrid cloud"],
  },
  {
    slug: "soc-baseline-azure",
    name: "SOC Baseline for Azure",
    tagline: "Detections, log retention, and response playbooks aligned to SOC 2 prep.",
    category: "Security / SOC",
    clouds: ["Azure"],
    technologies: ["Microsoft Sentinel", "Defender", "Azure Policy", "Key Vault"],
    difficulty: "Enterprise",
    deploymentHours: 20,
    priceUsd: 2190,
    problem: "Security questionnaires fail without centralized detections and evidence.",
    audience: ["Security engineers", "Compliance leads"],
    features: ["Detection rules pack", "Log retention map", "IR runbooks", "Evidence export"],
    components: ["Sentinel workspace", "Data connectors", "Analytics rules"],
    requirements: ["Azure AD P2 recommended", "Log Analytics workspace"],
    deploymentSteps: ["Enable data sources", "Deploy rule pack", "Tune false positives", "Export evidence"],
    securityNotes: ["PII redaction guidance", "Break-glass logging"],
    included: ["Terraform + KQL", "SOC 2 mapping sheet", "Weekly review checklist"],
    version: "1.5.0",
    changelog: "New identity anomaly detections.",
    useCases: ["B2B SaaS", "Fintech prep", "Healthcare adjacent"],
  },
  {
    slug: "dr-multi-region-playbook",
    name: "DR & Business Continuity Playbook",
    tagline: "RTO/RPO templates, failover drills, and backup verification for cloud workloads.",
    category: "Business continuity / DR",
    clouds: ["Azure", "AWS"],
    technologies: ["Terraform", "Geo-redundant storage", "Runbooks"],
    difficulty: "Advanced",
    deploymentHours: 16,
    priceUsd: 1790,
    problem: "Backups exist but nobody has tested restore or documented RTO.",
    audience: ["Platform teams", "CTOs"],
    features: ["RTO/RPO calculator", "Failover drill scripts", "Backup test calendar"],
    components: ["GRS storage", "DB PITR config", "DNS failover notes"],
    requirements: ["Defined critical services", "Maintenance window"],
    deploymentSteps: ["Classify tiers", "Configure replication", "Run tabletop", "Execute restore test"],
    securityNotes: ["Encrypted backups", "Access separation for restore roles"],
    included: ["Runbooks", "Drill templates", "Executive summary deck"],
    version: "2.0.0",
    changelog: "Added cross-region traffic shifting appendix.",
    useCases: ["Enterprise SaaS", "Marketplace platforms"],
  },
  {
    slug: "finops-guardrails",
    name: "FinOps Guardrails Pack",
    tagline: "Budget alerts, tagging policy, and rightsizing loops for cloud spend control.",
    category: "FinOps / cost control",
    clouds: ["Azure", "AWS", "GCP"],
    technologies: ["Terraform", "Cost Management", "Budgets API", "Tag policies"],
    difficulty: "Intermediate",
    deploymentHours: 6,
    priceUsd: 690,
    problem: "Cloud bills spike silently until finance escalates.",
    audience: ["FinOps", "Engineering managers"],
    features: ["Mandatory tags", "Budget thresholds", "Anomaly alerts", "Monthly review deck"],
    components: ["Policy definitions", "Budget resources", "Dashboard"],
    requirements: ["Billing reader access", "Tag taxonomy agreed"],
    deploymentSteps: ["Apply tag policy", "Create budgets", "Connect alerts", "Review first month"],
    securityNotes: ["Read-only cost roles by default"],
    included: ["Policy JSON/Terraform", "Tag dictionary", "CFO one-pager"],
    version: "1.1.2",
    changelog: "GCP budget module preview.",
    useCases: ["Multi-subscription orgs", "Agencies with many clients"],
  },
  {
    slug: "private-rag-azure",
    name: "Private RAG on Azure",
    tagline: "VPC-style AI: embeddings, vector store, and guarded inference for internal docs.",
    category: "Private AI / RAG",
    clouds: ["Azure"],
    technologies: ["Azure OpenAI", "AI Search", "Private Endpoints", "FastAPI workers"],
    difficulty: "Advanced",
    deploymentHours: 18,
    priceUsd: 1990,
    featured: true,
    problem: "Teams want GenAI without sending documents to public SaaS.",
    audience: ["AI platform teams", "Enterprise IT"],
    features: ["Private endpoints", "Document ingestion pipeline", "Prompt guardrails", "Audit logging"],
    components: ["OpenAI", "AI Search", "Storage", "Worker queue"],
    requirements: ["Azure OpenAI access", "Document classification policy"],
    deploymentSteps: ["Provision private resources", "Deploy ingestion", "Configure retrieval API", "Pen-test checklist"],
    securityNotes: ["No training on customer data", "PII scrub step documented"],
    included: ["IaC modules", "Reference API", "Security review checklist"],
    version: "0.9.0",
    changelog: "Added hybrid search ranking notes.",
    useCases: ["Internal knowledge base", "Support copilot", "Engineering docs"],
  },
  {
    slug: "aks-production-baseline",
    name: "AKS Production Baseline",
    tagline: "Hardened Kubernetes with ingress, secrets, and autoscaling patterns.",
    category: "Kubernetes",
    clouds: ["Azure"],
    technologies: ["AKS", "Terraform", "NGINX ingress", "Cert-manager", "KEDA"],
    difficulty: "Enterprise",
    deploymentHours: 22,
    priceUsd: 2290,
    problem: "Clusters are deployed fast but lack security and day-2 operations.",
    audience: ["Platform engineering", "SRE"],
    features: ["Private cluster option", "Workload identity", "HPAs + KEDA", "Pod security"],
    components: ["AKS", "ACR", "Key Vault CSI", "Monitoring agents"],
    requirements: ["Dedicated subnet", "Container images in ACR"],
    deploymentSteps: ["Network prep", "Cluster apply", "Install ingress", "Deploy sample workload"],
    securityNotes: ["RBAC enabled", "Network policies template included"],
    included: ["Terraform", "Helm values", "Upgrade runbook"],
    version: "1.3.0",
    changelog: "azurerm 4.x autoscaling flag updates.",
    useCases: ["Microservices SaaS", "Data pipelines"],
  },
  {
    slug: "saas-multitenant-core",
    name: "Multi-tenant SaaS Core",
    tagline: "Tenant isolation patterns, billing hooks, and admin separation for B2B SaaS.",
    category: "Production SaaS",
    clouds: ["Azure", "Self-hosted"],
    technologies: ["PostgreSQL RLS", "FastAPI", "Stripe webhooks", "Terraform"],
    difficulty: "Advanced",
    deploymentHours: 14,
    priceUsd: 1590,
    popular: true,
    problem: "Early SaaS code mixes tenants and blocks enterprise deals.",
    audience: ["Founding engineers", "Product-led B2B"],
    features: ["Tenant context middleware", "RLS examples", "Feature flags", "Audit trail"],
    components: ["API layer", "DB migrations", "Webhook handlers"],
    requirements: ["PostgreSQL 15+", "Payment provider account optional"],
    deploymentSteps: ["Apply schema", "Configure tenant resolver", "Wire billing hooks", "Load test isolation"],
    securityNotes: ["Cross-tenant tests included", "Secrets via Key Vault pattern"],
    included: ["Reference implementation", "Test suite outline", "Sales security FAQ"],
    version: "2.2.0",
    changelog: "Added org-level SSO integration notes.",
    useCases: ["Vertical SaaS", "DevTools", "Marketplaces"],
  },
  {
    slug: "agency-client-deploy",
    name: "Agency Client Deploy Platform",
    tagline: "Repeatable per-client stacks with branding guide and teardown scripts.",
    category: "Agency platforms",
    clouds: ["Self-hosted", "Azure"],
    technologies: ["Docker", "Terraform workspaces", "GitHub Actions"],
    difficulty: "Intermediate",
    deploymentHours: 9,
    priceUsd: 1190,
    problem: "Agencies rebuild infra manually for every client engagement.",
    audience: ["Dev agencies", "Consultancies"],
    features: ["Workspace-per-client", "REBRANDING checklist", "Teardown docs", "Handoff pack"],
    components: ["Deploy scripts", "Env templates", "Monitoring lite"],
    requirements: ["Client domain access", "Secrets handoff process"],
    deploymentSteps: ["Clone blueprint", "Run rebrand doc", "Deploy staging", "Client sign-off"],
    securityNotes: ["Separate state files", "No shared DB between clients"],
    included: ["Scripts", "Client handoff PDF template", "Support SLA suggestions"],
    version: "1.0.0",
    changelog: "Initial release.",
    useCases: ["White-label SaaS", "Managed hosting"],
  },
  {
    slug: "aws-ecs-fargate-api",
    name: "AWS ECS Fargate API Platform",
    tagline: "Serverless containers with ALB, RDS, and CI deploy for API-first products.",
    category: "Azure cloud architectures",
    clouds: ["AWS"],
    technologies: ["ECS Fargate", "RDS", "Terraform", "GitHub Actions"],
    difficulty: "Advanced",
    deploymentHours: 15,
    priceUsd: 1490,
    problem: "Teams on AWS need a proven API hosting pattern without EKS complexity.",
    audience: ["AWS-native startups", "Migration teams"],
    features: ["Blue/green deploy", "Secrets Manager", "WAF-ready ALB", "Autoscaling"],
    components: ["ECS service", "RDS Postgres", "ALB", "ECR"],
    requirements: ["AWS account", "Route53 hosted zone"],
    deploymentSteps: ["Bootstrap state", "Apply modules", "Configure CI", "Smoke test API"],
    securityNotes: ["Security groups least privilege", "Encryption at rest defaults on"],
    included: ["Terraform modules", "Diagrams", "Cost worksheet"],
    version: "1.4.0",
    changelog: "RDS Proxy optional module.",
    useCases: ["Public APIs", "Mobile backends"],
  },
];

export function getBlueprint(slug: string): Blueprint | undefined {
  return blueprints.find((b) => b.slug === slug);
}

export function slugifyCategory(category: BlueprintCategory): string {
  return category
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export function categoryFromSlug(slug: string): BlueprintCategory | undefined {
  return BLUEPRINT_CATEGORIES.find((c) => slugifyCategory(c) === slug);
}
