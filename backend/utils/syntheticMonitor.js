/**
 * Synthetic User Monitoring (SUM) Script Runner
 * Scripted transaction steps running periodically to verify system availability.
 */

export class SyntheticMonitor {
    /**
     * Executes a mock headless user transaction step with timing and status assertions
     */
    runScenario(scenarioName, executeMockRequest) {
        const startTime = Date.now();
        let statusCode = 200;
        let responsePayload = null;
        let error = null;

        try {
            responsePayload = executeMockRequest();
            if (responsePayload && responsePayload.statusCode) {
                statusCode = responsePayload.statusCode;
            }
        } catch (err) {
            statusCode = 500;
            error = err.message;
        }

        const durationMs = Date.now() - startTime;
        const latencyLimitMs = 500; // SLA requirement is response under 500ms

        const isSuccess = !error && statusCode === 200 && durationMs < latencyLimitMs;
        let failReason = null;

        if (statusCode !== 200) {
            failReason = `HTTP_${statusCode}`;
        } else if (durationMs >= latencyLimitMs) {
            failReason = `LATENCY_SLA_BREACH_${durationMs}ms`;
        }

        if (isSuccess) {
            console.log(`   [Synthetic SUM] Scenario "${scenarioName}" passed in ${durationMs}ms.`);
        } else {
            console.warn(`   🚨 [Synthetic SUM] Scenario "${scenarioName}" FAILED! Code: ${statusCode} | Time: ${durationMs}ms | Reason: ${failReason || error}`);
        }

        return {
            scenario: scenarioName,
            passed: isSuccess,
            statusCode,
            latencyMs: durationMs,
            error: failReason || error
        };
    }
}
