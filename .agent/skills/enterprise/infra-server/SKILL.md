# Cloud Infrastructure Skill (Enterprise)

## Purpose

Design and manage highly available, cost-effective, and secure cloud environments.

## Stack

- **Compute**: Google Cloud Run / AWS Fargate (Serverless Containers).
- **Messaging**: Pub/Sub or Kafka.
- **Storage**: Cloud Storage (Signed URLs for security).
- **Content Delivery**: Cloud CDN / Cloudflare.

## High Availability (HA)

- **Multi-Zone Redundancy**: Minimum 3 zones per region.
- **Auto-Scaling**: Configured with strict min/max instances.
- **Global Load Balancing**: Anycast IP for low-latency routing.

## Cost Guards

- **Auto-Scale Caps**: Prevent runaway costs during spikes.
- **Budget Alerts**: Human notification at 50%, 80%, and 100% budget.
- **Resource Tagging**: Enforced tagging for cost attribution by department.

## Disaster Recovery (DR)

- **Automatic Backups**: Daily snapshots with 30-day retention.
- **Recovery Point Objective (RPO)**: < 1 minute for critical data.
- **Recovery Time Objective (RTO)**: < 15 minutes for primary services.

## Outputs

- **Terraform / IaC Templates**: Infrastructure as code.
- **Scaling Policy**: JSON definition of scaling rules.
- **Security Group Definitions**: Fine-grained network access controls.
