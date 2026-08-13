# Phase 7 Mathematical Specification: Digital Twin Mathematical Universe

This document defines the mathematical models, coordinate projection schemas, and simulation parameters of the Village Intelligence Infrastructure (VII) Digital Twin.

---

## 1. The Virtual Brain Graph Representation

The physical village road layout and vehicle resources are modeled as a weighted directed graph:
\[
G = (V, E, W)
\]
where:
- \(V\) represents key transit locations, farm warehouses, and mandi drops as nodes (vertices).
- \(E\) represents physical paths, roads, and village trails as edges.
- \(W\) is the weight matrix representing travel impedance (calculated dynamically from physical parameters like distance, road dampness, and cargo load).

---

## 2. Coordinate Projection & Transformations

Geospatial coordinate streams (latitude \(\phi\), longitude \(\lambda\)) collected via client telemetry (Phase 2) are projected into localized Cartesian grid coordinates (\(x, y\)) to run distance and proximity calculations.

### 2.1 The Haversine Distance Transform
The spatial distance \(d\) between two nodes is computed via:
\[
a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)
\]
\[
c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)
\]
\[
d = R \cdot c
\]
where \(R\) is the Earth's radius (6,371 km).

### 2.2 Telemetry Noise Smoothing (Moving Window Filter)
To prevent GPS jitter from triggering false route-deviation alerts, coordinates are filtered using a moving average smoothing window:
\[
x_t = \frac{1}{k} \sum_{i=0}^{k-1} x_{t-i}, \quad y_t = \frac{1}{k} \sum_{i=0}^{k-1} y_{t-i}
\]
where \(k\) is the window size (typically \(k=5\) telemetry packets).

---

## 3. Twin Proximity Simulation Parameters

The 3D proximity radar simulation maps neighboring vehicles on paths in real-time, calculating collision risks and blind spots:

### 3.1 Relative Proximity Vectors
For a target vehicle at coordinates \((x_v, y_v)\) and a neighboring asset at \((x_n, y_n)\), the relative distance vector \(\vec{r}_{rel}\) is:
\[
\vec{r}_{rel} = (x_n - x_v, y_n - y_v)
\]
The collision hazard index \(H\) is calculated using relative speed \(\vec{v}_{rel}\):
\[
H = \frac{1}{\|\vec{r}_{rel}\|} \cdot \max(0, \vec{v}_{rel} \cdot \hat{r}_{rel})
\]
If \(H\) exceeds the safety threshold defined in the system parameters, the control drawer triggers blind-spot alarms and forces a safety lockout (Phase 4).

### 3.2 Lane Curving Math
Dynamic path curves are simulated using quadratic Bezier interpolation between nodes:
\[
B(t) = (1-t)^2 P_0 + 2(1-t)t P_1 + t^2 P_2, \quad t \in [0, 1]
\]
where:
- \(P_0\) is the origin node (departure checkpoint).
- \(P_2\) is the target node (destination checkpoint).
- \(P_1\) is the control node representing road curvature.
- This Bezier mapping is rendered visually in the Autopilot radar component, synchronizing actual vehicle coordinates with the frontend journey tracking.
