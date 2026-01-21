# Governance Skill

## Purpose

Ensure safety, compliance, and reliability of AI-generated decisions across the enterprise.

## Mandatory Rules

- **No Direct Production Access**: Agents cannot deploy to production or modify live production environments.
- **Credential Protection**: Agents must never request, store, or output secrets, API keys, or PII.
- **Rollback First**: Every proposed change must include a reversal or rollback strategy.

## Risk Thresholds

| Change Type | Risk Level | Approval Required |
| :--- | :--- | :--- |
| UI/UX Text Update | Low | Auto-proceed |
| New UI Component | Medium | Tech Lead Review |
| API Schema Change | High | Mandatory Architect Review |
| DB Migration | High | Mandatory DBA Review |
| Security/Auth Change | Critical | Security + CTO Review |
| Infra Scaling Policy | Medium | DevOps Review |

## Human-in-the-Loop (HITL) Gating

- All `High` and `Critical` tasks **MUST** be blocked until a human `notify_user` response is received with explicit approval.

## Audit Logging

- Every orchestrator decision and agent output must be recorded in the `.brain/audit_logs/` for 365 days.
- Logs must include the original user intent and the `decision_schema.json` generated.

## Forbidden Actions

- Deleting production database tables.
- Bypassing existing CI/CD pipelines.
- Modifying security group rules without explicit peer review.
