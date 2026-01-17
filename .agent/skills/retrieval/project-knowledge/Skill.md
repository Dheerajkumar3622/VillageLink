---
name: knowledge-retrieval
description: Retrieval skill for navigating the VillageLink codebase, documentation, and technical decisions stored in .md files.
---

# Knowledge Retrieval Skill 📚

This skill enables the agent to act as a "Project Historian" by efficiently searching and connecting technical documentation.

## Knowledge Sources
- **Implementation Plans**: Found in `brain/implementation_plan.md`.
- **Walkthroughs**: Found in `brain/walkthrough.md`.
- **System Architecture**: Found in `README.md` and `docs/`.
- **Core Types**: Defined in `types.ts`.

## Retrieval Patterns
- "Find the decision behind the [COMPONENT] styling."
- "List all backend routes related to [FEATURE]."
- "Identify the owner and contact for [MODULE]."

## Best Practices
- Cross-reference `task.md` to see current work state.
- Always check the `types.ts` before proposing new data structures.
- Use `view_file` on `.env.example` to understand required integrations.
