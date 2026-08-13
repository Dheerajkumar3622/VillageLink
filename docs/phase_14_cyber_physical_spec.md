# Phase 14 Mathematical Specification: Cyber-Physical Intelligence Infrastructure (CPII)

This document formalizes the physical state vectors, sensor fusion Kalman formulations, predictive maintenance triggers, and cyber-physical security boundaries of the CPII.

---

## 1. Physical State Vector Formulations

To monitor physical assets in real time (Phase 1), the system models each vehicle and storage hub using a multi-dimensional state vector:
\[
\vec{S}_{\text{asset}}(t) = \begin{bmatrix} T_{\text{temp}} \\ R_{\text{rpm}} \\ M_{\text{load}} \\ V_{\text{battery}} \\ \omega_{\text{vib}} \end{bmatrix}
\]
where:
- \(T_{\text{temp}}\) is engine/motor thermal state (or cold storage ambient temp).
- \(R_{\text{rpm}}\) is rotational speed of the motor.
- \(M_{\text{load}}\) is suspension strain cargo load (verified in Phase 11).
- \(V_{\text{battery}}\) is battery terminal voltage.
- \(\omega_{\text{vib}}\) is the three-axis structural vibration frequency.

---

## 2. Sensor Fusion (Kalman Filter Heuristic)

To resolve GPS signal dropouts on rural canopy routes (Phase 1, 10), client devices fuse NavIC/GPS coordinates with onboard accelerometer readings:

\[
\hat{x}_{k} = \hat{x}_{k-1} + v_{k-1} \Delta t + \frac{1}{2} a_{k-1} \Delta t^2
\]
\[
K_k = \frac{P_{k}^-}{P_{k}^- + R}
\]
\[
\hat{x}_k = \hat{x}_{k}^- + K_k \left( z_k - \hat{x}_{k}^- \right)
\]
where:
- \(\hat{x}_k\) is the fused location coordinate estimation.
- \(a_{k-1}\) is the accelerometer input vector.
- \(z_k\) is raw NavIC satellite coordinate measurement.
- \(K_k\) is the Kalman Gain balancing signal reliability.

---

## 3. Predictive Maintenance Warning Triggers

Automated triggers execute protective actions when telemetry parameters violate threshold bounds:

1. **Cold Storage Failure Rule**:
   If ambient temperature rise exceeds limit:
   \[
   T_{\text{storage}} > 8.0^{\circ}\text{C} \quad \text{AND} \quad \frac{\Delta T_{\text{storage}}}{\Delta t} > 0.5^{\circ}\text{C/min}
   \]
   - *Action*: Triggers a high-priority logistics dispatch request to empty the storage before crop decay (Phase 1) occurs.
2. **Thermal Vehicle Overload Rule**:
   If \(T_{\text{temp}} > 105^{\circ}\text{C}\) or battery voltage drop rate \(\Delta V_{\text{battery}}/\Delta t < -2.0\text{V/min}\).
   - *Action*: Forces safety shutdown state, locking matching pools (Phase 6).

---

## 4. Cyber-Physical Security (Anti-Spoofing Filter)

To protect the coordination network against fake GPS coordinates and route injection attacks:

- **Speed Consistency Boundary**: The system calculates spatial velocity:
  \[
  v_{\text{calc}} = \frac{d(\vec{x}_t, \vec{x}_{t-1})}{\Delta t}
  \]
  If \(v_{\text{calc}} > v_{\text{max\_physical}}\) (e.g., auto-rickshaw speed > 85 km/h), the coordinate stream is flagged as **GPS Spoofing Attack**.
- **Self-Healing Override**: The vehicle node is immediately marked as `INACTIVE` in the Unified Knowledge Graph (Phase 9), terminating matching contracts in the MDE (Phase 11) to prevent route hijack.
