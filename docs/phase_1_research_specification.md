# Phase 1 Research Specification: Problem Decomposition & Conceptual Research

This document outlines the first-principles analysis and conceptual decomposition of rural coordination constraints for the Village Intelligence Infrastructure (VII).

---

## 1. Decomposing the Rural Mobility Gap

### 1.1 Demand Fragmentation
- **Definition**: Rural travel demand is highly sparse and non-continuous compared to dense urban corridors.
- **First-Principles Limit**: Passengers travel at specific peak windows (morning market trips, school timings, seasonal harvests) leaving vehicles idle for up to 80% of the daily operational window.
- **System Impact**: Traditional ride-hailing algorithms fail because vehicle search density is too low to maintain a stable, real-time matching market.

### 1.2 Information Asymmetry & Transmission Delays
- **Definition**: The propagation delay of transportation opportunities between drivers and passengers.
- **Physics of Delay**: Without a central visibility ledger, a driver departs empty while a passenger waits 1 km away. The delay in matching is bounded by manual sight lines or voice calls, introducing significant operational inefficiencies.
- **Metric**: Coordination Latency (\(\tau_c\)) is the time elapsed between resource availability and allocation consensus.

---

## 2. Decomposing Agricultural Logistics Gaps

### 2.1 Crop Decay Time Limits (Shelf-Life Constraints)
- **First-Principles Limit**: Perishable fresh crops (e.g., green vegetables) undergo metabolic degradation immediately post-harvest. The maximum transit window is bounded by the temperature-sensitive decay curve:
  \[
  t_{\text{decay}} = f(T, H)
  \]
  where \(T\) is ambient temperature and \(H\) is humidity.
- **Logistical Constraint**: If transportation coordination takes longer than \(t_{\text{decay}}\), the economic value of the cargo drops to zero. Real-time matching must treat decay time as a hard constraint.

### 2.2 Cold Storage & Transit Latency
- **Decomposition**: Rural warehouses and transport vehicles operate under varying thermal conditions. 
- **System Impact**: Transit mapping must prioritize routes that minimize thermal stress on cargo, balancing speed against vehicle suspension load limits on rural terrain.

---

## 3. Decomposing Local Coordination Challenges

### 3.1 Trust Variables in Informal Economics
- **Decomposition**: Transactions in rural settings rely heavily on pre-existing social structures and informal credit agreements (e.g., Udhaar).
- **Engineering Constraint**: A coordination system cannot enforce rigid cash-only or online-only payment gates without excluding critical participants. The platform must model flexible, trust-aware payment flows (e.g., Cash, Escrow, Barter, Udhaar) within its core types.

### 3.2 Connectivity Dropouts (Offline Operations)
- **Decomposition**: Intermittent cellular connectivity (edge nodes operating without active backhaul link to central cloud servers).
- **System Impact**: Matching protocols must run locally on the edge, queuing sync payloads until connection is restored. This requires a delay-tolerant synchronization queue that avoids data loss during transitions.

---

## 4. Current System Mapping & Boundaries

We map the existing codebase modules against the decomposed constraints:

1. **Shared Types (`shared/src/types.ts`)**:
   - Matches the trust constraints by defining explicit multi-payment types (`UDHAAR`, `BARTER`, `ESCROW`, `GRAMCOIN`).
   - Represents physical constraints via telemetry definitions (`batteryVoltage`, `engineTemp`, `suspensionLoad`).

2. **Logistics Interface (`frontend/components/LogisticsApp.tsx`)**:
   - Simulates physical pickup constraints by enforcing weight verification stages.
   - Enforces cryptographic confirmation using simulated QR scans at milestones.

3. **Offline Sync Handler (`frontend/services/offlineService.ts`)**:
   - Resolves the connectivity dropout constraint by implementing an offline action queue that retries sync actions on connection recovery, preventing data loss.
