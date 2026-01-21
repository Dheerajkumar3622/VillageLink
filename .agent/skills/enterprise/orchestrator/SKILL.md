# Orchestrator Skill

## Purpose

The Orchestrator is the central intelligence of the Antigravity Brain. It classifies user intent, routes tasks to specialized agents, and ensures compliance with governance rules.

## Decision Flow

1. **Classify Intent**: Determine the primary domain(s) of the request.
2. **Assess Risk**: Use the `governance` skill to determine `risk_level`.
3. **Route Agents**: Select specialized agents (UI, Backend, DB, Infra) and load corresponding skills.
4. **Standardize Handoff**: Generate a `decision_schema.json` compliant object.
5. **Enforce Approval**: Gate execution based on risk thresholds.

## Core Logic

- If a task involves `SQL` or `NoSQL` changes → Invoke `database-architect`.
- If a task involves `API` or `OAuth2` → Invoke `backend-architect`.
- If a task involves `Screen` or `Component` layout → Invoke `ui-intelligence`.
- If a task involves `Scaling` or `Deployment` → Invoke `infra-server`.

## Constraints

- Must always validate outputs against `governance/SKILL.md`.
- Cannot bypass human approval for `critical` risk tasks.

## Outputs

- `decision_schema.json` compliant routing object.
- Coordinated multi-agent task execution plan.
