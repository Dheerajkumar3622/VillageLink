# Phase 21 System Specification: Anti-Fragile Evolution Framework (AEF)

This document defines the vendor abstraction wrapper schemas, failure database parameters, MOAT classifications, and the founder's daily 10-question checklist of the AEF.

---

## 1. Vendor Abstraction Schema (Model Independence)

To ensure the platform is robust against pricing changes or outages from proprietary AI API vendors (Phase 3), the reasoning engine (Phase 8) utilizes a unified abstraction adapter:

```typescript
export interface AIProviderConfig {
    provider: 'GEMINI' | 'CLAUDE' | 'OPENAI' | 'LOCAL_ON_DEVICE';
    apiKeyEnvName: string;
    requestTimeoutMs: number;
}

export interface ModelInferencePayload {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    responseFormat: 'JSON' | 'TEXT';
}

// Unified interface implemented by local and cloud AI adapters
export interface IAIModelGateway {
    executeInference(
        payload: ModelInferencePayload,
        config: AIProviderConfig[]
    ): Promise<string>;
}
```
- **Self-Healing Override**: If Gemini API returns status `503` or exceeds 2.5s timeout (Phase 4), the gateway automatically routes the query to Claude or falls back to local on-device small language models (SLMs).

---

## 2. Failure Database Schema & Parameters

Every transaction error, network dropout, and route calculation anomaly is logged in the MongoDB Failure database to feed back into closed-loop learning (Phase 12):

```json
{
  "failureId": "FAIL-SYNC-8921",
  "anomalyType": "SYNC_TIMEOUT",
  "sourceNode": "CLIENT-DRIVER-77",
  "contextState": {
    "networkSignalStrengthDbm": -112,
    "uncommittedEnvelopesCount": 8,
    "lastKnownCoordinates": { "lat": 24.95, "lng": 84.01 }
  },
  "errorCode": "ERR_SOCKET_TIMEOUT",
  "resolutionActionTaken": "Preserved failed envelopes in localStorage, rescheduled sync job on network state change.",
  "timestamp": 1773731651000
}
```

---

## 3. The Long-Term MOAT Definition

VII builds a defensibility moat that cannot be replicated by generic LLM wrappers:

1. **Longitudinal Telemetry Data**: The database accumulates years of high-resolution GPS coordinates (Phase 7), physical vibration telemetry, and crop degradation profiles (Phase 14) unique to rural biomes.
2. **Reputation Trust Graphs**: Localized citizen-provider trust graphs (Phase 13) built via verifiable physical QR checkpoints (Phase 16).
3. **Decentralized Local Buffer**: An offline-first synchronization infrastructure (Phase 10) validated in actual field pilots.

---

## 4. Founder's 10-Question Daily Checklist

To prevent scope creep (Phase 4) and track developmental health, the founder evaluates these 10 questions daily:

1. Did we introduce any ungrounded technological additions (metaverse, blockchain, complex robotics) today?
2. Did the Mean Absolute Error (MAE) of route ETAs exceed the 15-minute drift threshold in any active pilot?
3. Have all dynamic pricing surges remained strictly bounded by the database minimum/maximum price limits?
4. Are offline synchronizations completing without dropping failed transaction envelopes?
5. Did we verify all new API changes against the shared types schema catalog?
6. What is the current TRL (Technology Readiness Level) score of our active matching modules?
7. Did our model gateway have to execute any vendor fallback overrides today?
8. Are we dedicating at least 30% of our daily time allocations to active building and coding?
9. Is our research gap documentation verified against peer-reviewed academic literature?
10. Did we execute any automated dispatch decisions without obtaining explicit human confirmation?
