# Tool Wiring Guide: Enterprise Agent Skills

## Overview

Antigravity Agent Skills are tool-agnostic. This guide explains how to connect the Skills in `.agent/skills/` to your favorite development tools.

---

## 1. Cursor

Cursor can index your local codebase, including the `.agent/skills/` directory.

- **Setup**: Open Cursor Settings > General > Rules for AI.
- **Rule**: "Always consult the relevant `SKILL.md` in `.agent/skills/enterprise/` before suggesting architectural changes. Use `decision_schema.json` for task routing."
- **Context**: When chatting, @ the relevant `SKILL.md` file to ensure the AI follows the enterprise standards.

---

## 2. Gemini CLI

Pass the skill instructions as part of the context or via specific skill paths.

```bash
# Example usage for DB migration
gemini run \
  --context .agent/skills/enterprise/database-architect/SKILL.md \
  --context .agent/skills/enterprise/governance/SKILL.md \
  --task "Generate a zero-downtime migration for order_history table"
```

---

## 3. VS Code (Copilot / Antigravity Extension)

Configure your workspace settings to prioritize skill files.

- **Workspace Rules**: Create a `.cursorrules` or `.agent/config` file (tool-dependent) that points to the skills directory.
- **Example**:

  ```json
  {
    "agent_skills_path": "./.agent/skills/enterprise",
    "enforce_governance": true
  }
  ```

---

## 4. CI/CD Pipeline Integration

Use a script to validate PRs against the Governance skill.

- **Audit**: Run a linter that checks if `OpenAPI` specs or `Terraform` files in the PR match the standards defined in `backend-architect/SKILL.md` or `infra-server/SKILL.md`.
- **Enforcement**: Block merges that violate the "No Direct Production Access" rule.

---

## 5. Claude Code / Other CLI Agents

Most CLI agents support reading files. Prepend the skill content to your prompt.

```bash
cat .agent/skills/enterprise/ui-intelligence/SKILL.md | claude ... "Design a login screen for VillageLink"
```
