# Phase 29 System Specification: Impact Science & Measurement Framework (ISMF)

This document formalizes the four layers of impact metrics, composite index equations, and the three parallel execution tracks of the ISMF.

---

## 1. The Four Layers of Impact Metrics

The VIP evaluates deployment success by measuring changes across four distinct stakeholder layers:

- **Individual Impact**:
  - Transport travel cost savings per citizen node (Phase 5).
  - Coordination delay reductions (waiting time at stops).
  - Verifiable emergency medical transit accessibility.
- **Community Impact**:
  - Growth in collaborative network trust graphs (Phase 13).
  - Volume of local informal peer credit (`UDHAAR`) transactions resolved without disputes.
  - Active participation density in local Panchayat policy votes.
- **Economic Impact**:
  - Farmer net crop revenue increases due to reduced transit decay rates (Phase 1, 14).
  - Reduction in empty logistics return miles (Phase 18).
  - Income increases for localized cooperative drivers.
- **Environmental Impact**:
  - Reduced greenhouse gas (CO2) emissions through multi-hop vehicle cargo pooling (Phase 11).
  - Fuel consumption efficiency gains from Bezier lane route optimization (Phase 7).

---

## 2. Composite Index Mathematical Formulas

To track systemic resilience, the framework computes four composite indices quarterly:

### 2.1 Coordination Index (CI)
The efficiency of matching available resources to demand nodes:
\[
\text{CI} = \frac{\text{Opportunities Confirmed}}{\text{Opportunities Generated}}
\]

### 2.2 Community Resilience Index (CRI)
The network's survival rating under extreme infrastructure drops:
\[
\text{CRI} = \alpha \cdot \text{TrustGraphDensity} + \beta \cdot \text{OfflineSurvivalRate}
\]
where:
- \(\text{OfflineSurvivalRate}\) is the percentage of client transactions synchronized successfully after cellular dropouts (Phase 10).
- \(\alpha = 0.60, \beta = 0.40\) are weight coefficients.

### 2.3 Opportunity Index (OI)
The utilization efficiency of regional cargo spaces:
\[
\text{OI} = \frac{\sum \text{Used Capacity}}{\sum \text{Total Capacity Available}}
\]

### 2.4 Trust Index (TI)
The validation compliance rate across all segment nodes:
\[
\text{TI} = \frac{\text{Cryptographic QR Checks Executed}}{\text{Total Trips Completed}}
\]

---

## 3. The 3 Parallel Execution Tracks Roadmap

To balance immediate business viability with long-term academic and protocol research, development is split into three independent pipelines:

```
+---------------------------------------------------------------------------------+
| TRACK C: RESEARCH & STANDARDS (5–10 Years)                                      |
| Formalizing CCS coordination equations; aligning ONDC/Beckn global standards.   |
+---------------------------------------------------------------------------------+
| TRACK B: PLATFORM ENGINE (2–5 Years)                                            |
| Hardening offline edge synchronization queues; building plug-in sandbox SDKs.  |
+---------------------------------------------------------------------------------+
| TRACK A: PRODUCT MVP (6–18 Months)                                              |
| Deploys Passenger, Matching, Offline, and QR modules to Sasaram district.       |
+---------------------------------------------------------------------------------+
```
- **Execution Rule**: Code written for Track A must remain modular (Phase 15) to allow clean integration into Track B without requiring rewrites.
