/**
 * SAST (Static Application Security Testing) Code Auditor Simulator
 * Scans code files for credential leaks, eval commands, and raw string query concatenations.
 */

export class SastAuditor {
    constructor() {
        this.rules = {
            HARDCODED_SECRET: {
                pattern: /((key|secret|password|token)\s*=\s*['"][a-zA-Z0-9_-]{12,}['"])/i,
                severity: 'CRITICAL',
                message: 'Hardcoded secret or credential token assignment detected.'
            },
            UNSAFE_EVAL: {
                pattern: /(\beval\s*\(|\bnew\s+Function\s*\()/i,
                severity: 'HIGH',
                message: 'Usage of unsafe dynamic execution (eval or Function constructor).'
            },
            SQL_INJECTION_RISK: {
                pattern: /(\.query\s*\(\s*['"`].*\$\{.*['"`]\))/i,
                severity: 'HIGH',
                message: 'Unsafe raw SQL template interpolation. Use parameterized queries instead.'
            }
        };
    }

    /**
     * Statically audits raw code file content line by line
     */
    auditContent(fileName, fileContent) {
        const findings = [];
        const lines = fileContent.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
            const lineContent = lines[i];

            for (const [ruleName, ruleInfo] of Object.entries(this.rules)) {
                if (ruleInfo.pattern.test(lineContent)) {
                    findings.push({
                        file: fileName,
                        lineNumber: i + 1,
                        rule: ruleName,
                        severity: ruleInfo.severity,
                        message: ruleInfo.message,
                        offendingLine: lineContent.trim()
                    });
                }
            }
        }

        return {
            pass: findings.length === 0,
            findings
        };
    }
}
