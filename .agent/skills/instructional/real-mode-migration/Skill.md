---
name: real-mode-migration
description: Instructional skill for transitioning VillageLink features from mock data/hardcoded loops to real backend API integrations.
---

# Real Mode Migration Skill 🚀

This skill provides the standard procedure for converting "Mock" features into "Real" production-ready features in the VillageLink ecosystem.

## When to use this skill
- When a service (e.g., `mlService.ts`) contains hardcoded arrays or `setTimeout` mocks.
- When a component (e.g., `PassengerView.tsx`) has local state that should be fetched from the database.
- During Phase 5 (Logistics), Phase 6 (Payments), and beyond.

## Migration Procedure

### 1. Backend Analysis
- Check `backend/models/` for an existing schema.
- If no schema exists, create a new one in `backend/models/extraModels.js` or `backend/models/gramMandiModels.js`.
- Add a corresponding route in `backend/routes/`.

### 2. Frontend Service Update
- Identify the mock function in `services/*.ts`.
- Replace the local array with a `fetch()` call to the new backend endpoint.
- Ensure authentication headers are included:
  ```typescript
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/api/...`, {
      headers: { Authorization: `Bearer ${token}` }
  });
  ```

### 3. Component Integration
- Update the component's `useEffect` to call the updated service.
- Remove any local "fallback" data logic.
- Handle loading and error states properly.

### 4. Data Seeding
- Add sample real-world data to `seed_real_data.js`.
- Run `node seed_real_data.js` to verify.

## Validation Checklist
- [ ] No `setTimeout` simulated delays remaining.
- [ ] Data persists in MongoDB Atlas.
- [ ] Frontend handles empty states gracefully.
- [ ] API routes follow the `/api/grammandi/...` or `/api/ai/...` pattern.
