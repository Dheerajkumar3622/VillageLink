# Phase 22 System Specification: Global Evidence & Knowledge Repository (GEKR)

This document formalizes the Evidence Confidence Scale (E0–E5), contradiction resolution schemas, and assumption registries of the GEKR.

---

## 1. Evidence Confidence Scale (ECS Matrix)

To measure the empirical validity of system optimizations, VIP structures research outputs into a 6-stage confidence hierarchy:

| Level | Classification | Verification Requirements | VII Subsystems |
| --- | --- | --- | --- |
| **E0** | Hypothesis | Mathematical equations and proofs (Phase 20). | Bayesian pricing models, TCC coordinate laws. |
| **E1** | Simulation | Simulated swarm negotiations, 3D radar testing (Phase 6, 7). | Autopilot Proximity Radar simulation controls. |
| **E2** | Sandboxed | Codebase compiles, type safety verified in local monorepo. | offline sync service checks (`npm run build`). |
| **E3** | Single-Node Pilot | 90-day active trial in 1 village (Sasaram) with > 100 trips. | Yatra Link passenger bookings. |
| **E4** | Multi-Node Pilot | Deployed across 5 adjacent villages, mapping cargo pooling. | Agriculture logistics mandi pipelines (Phase 16). |
| **E5** | Replicated Fact | Independent audit confirming statistical significance (Phase 17). | Decoupled platform routing engine logs. |

---

## 2. Contradiction Engine Schema

When telemetry sensor values conflict with database states (e.g., driver logs trip as `COMPLETED` but GPS trajectory indicates the vehicle is 5 km away from the destination Stop), the Contradiction Engine flags the mismatch:

```json
{
  "contradictionId": "CONTR-GPS-9921",
  "discrepancyType": "STATUS_LOCATION_MISMATCH",
  "sourceEntities": ["ticket.yatra.9821", "telemetry.driver.77"],
  "evidenceLeft": { "state": "COMPLETED", "timestamp": 1773733225000 },
  "evidenceRight": { "distanceToStopKm": 5.4, "timestamp": 1773733225000 },
  "confidenceScore": 0.12,
  "resolutionAction": "Flagged ticket state as DISPUTED, triggered audit log check, notified logistics operator."
}
```
- **Self-Healing Override**: Discrepancies automatically drop the driver's localized context reputation score (Phase 13) until milestone validation is cryptographically confirmed.

---

## 3. Assumption Registry Schema

The Assumption Registry tracks external dependencies. If an assumption is breached, the MDE (Phase 11) modifies its action policy:

```json
{
  "assumptionId": "ASM-GPS-AVAILABILITY",
  "precondition": "NavIC/GPS signal accuracy <= 15 meters",
  "checkedAt": 1773733225000,
  "status": "BREACHED",
  "impact": "Disables Google Maps Routing Service queries (Phase 4)",
  "fallbackExecuted": "Activated straight-line haversine distance router (Phase 7, 10)"
}
```
- **Operational Traceability**: Integrates with the failure database (Phase 21) to calculate cumulative research debt (unresolved signal breaches).
