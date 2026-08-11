# VillageLink Enterprise Infrastructure Plan
# Managed via Terraform IaC provider

resource "mongodbatlas_cluster" "village_db" {
  name                  = "villagelink-production-db"
  provider_name         = "AWS"
  provider_region_name  = "AP-SOUTH-1" # Mumbai region
  backing_provider_name = "AWS"
  cluster_type          = "REPLICASET"
  replication_factor    = 3
}

resource "render_service" "backend_api" {
  name        = "villagelink-node-backend"
  repo_url    = "https://github.com/Dheerajkumar3622/VillageLink"
  branch      = "main"
  environment = "node"
  plan        = "pro"
}

resource "api_gateway_load_balancer" "edge_lb" {
  name          = "villagelink-ingress-gateway"
  algorithm     = "round-robin"
  ssl_enforced  = true
}
