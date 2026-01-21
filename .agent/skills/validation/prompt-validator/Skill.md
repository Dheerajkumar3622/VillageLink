---
name: prompt-quality-validator
description: Validation skill for ensuring LLM prompts are precise, structured, and free of ambiguity before execution.
---

# Prompt Quality Validator Skill ✅

This skill ensures that every AI prompt generated for VillageLink (Sarpanch AI, Leaf Diagnosis, etc.) meets production standards.

## Validation Metrics

1. **Specificity**: Are roles and constraints clearly defined?
2. **Context**: Does the prompt include relevant data (e.g., location, crop type)?
3. **Format**: Is the output format (JSON, Markdown, List) specified?
4. **Safety**: Does it avoid hallucinations or harmful advice?

## Common Fixes

- **Weak**: "Help the farmer with their crop."
- **Strong**: "You are Sarpanch AI, an expert agronomist in Bihar. A farmer in [LOCATION] is reporting [DISEASE] on [CROP]. Provide a 3-step remedy plan using local organic ingredients. Output as a Markdown list."

## Checklist

- [ ] Role set (e.g., "Act as a security auditor")
- [ ] Constraint set (e.g., "No more than 50 words")
- [ ] Output type defined (e.g., "JSON only")
- [ ] Data anchored (e.g., "Use only the provided CSV data")
