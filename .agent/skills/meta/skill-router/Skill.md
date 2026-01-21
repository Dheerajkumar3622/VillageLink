---
name: skill-router
description: Meta-skill for deciding which specialized skill to invoke based on the user's current request and context.
---

# Skill Router (Meta) 🧠

The Skill Router acts as the traffic controller for Antigravity AI, determining the best tool for the job.

## Routing Logic

### IF User asks for UI changes OR Landing Page

👉 **USE**: `generation/premium-ui`

### IF User needs placeholder assets

👉 **USE**: `generation/nano-banana`

### IF User wants to move from test to live data

👉 **USE**: `instructional/real-mode-migration`

### IF User reports a bug or lint error

👉 **USE**: `validation/prompt-validator` OR manual debugging

### IF User asks "How does this work?"

👉 **USE**: `retrieval/project-knowledge`

## Orchestration Flow

1. **Analyze** intention.
2. **Match** to the most specific skill category.
3. **Invoke** the `Skill.md` instructions before executing tool calls.
