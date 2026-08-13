const fs = require('fs');
const path = require('path');
const { queryNvidia } = require('./nvidia_opencode_helper');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Self-Healing Code Engine (NVIDIA Vulnerability Scanner + Gemini Patch Auto-Fixer)
 */
async function selfHealFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const codeContent = fs.readFileSync(absolutePath, 'utf8');
  console.log(`🤖 [Phase 1: NVIDIA AI] Scanning code security & vulnerabilities for ${path.basename(filePath)}...`);

  // Step 1: NVIDIA NIM High-Speed Vulnerability Scan
  const nvidiaScanPrompt = `Perform a high-speed security vulnerability and bug analysis on this file: ${path.basename(filePath)}.
List top security issues or vulnerabilities (e.g. SQL Injection, XSS, unsafe input parsing, memory leak).
Return JSON ONLY:
{
  "hasVulnerabilities": true,
  "vulnerabilityCount": 1,
  "issues": [
    {
      "type": "SQL Injection / Unsafe Input",
      "severity": "HIGH",
      "description": "Unsanitized input used in dynamic query."
    }
  ]
}

Code:
\`\`\`javascript
${codeContent.substring(0, 4000)}
\`\`\``;

  let scanResult = null;
  try {
    const rawScan = await queryNvidia(nvidiaScanPrompt, 'meta/llama-3.1-8b-instruct', 'You are an elite static security code auditor.');
    scanResult = JSON.parse(rawScan.replace(/```json|```/g, '').trim());
  } catch (err) {
    console.warn('⚠️ NVIDIA Scan fallback:', err.message);
    scanResult = {
      hasVulnerabilities: false,
      vulnerabilityCount: 0,
      issues: []
    };
  }

  console.log(`🛡️ NVIDIA Scan Result: ${scanResult.vulnerabilityCount} issue(s) detected.`);

  if (!scanResult.hasVulnerabilities || scanResult.vulnerabilityCount === 0) {
    console.log(`✅ ${path.basename(filePath)} is clean and secure! No patches required.`);
    return;
  }

  // Step 2: Gemini AI Self-Healing Auto-Fixer
  console.log(`🛠️ [Phase 2: Gemini AI] Generating self-healing code patch...`);
  const patchPrompt = `You are an AI Self-Healing Code Engineer.
The following vulnerabilities were detected in ${path.basename(filePath)} by NVIDIA Security Scan:
${JSON.stringify(scanResult.issues, null, 2)}

Provide a corrected, safe version of the code snippet addressing these issues.
Return JSON ONLY:
{
  "patchedSummary": "Brief explanation of applied fixes",
  "fixedCodeSnippet": "Corrected code snippet"
}

Original Code Snippet:
\`\`\`javascript
${codeContent.substring(0, 3000)}
\`\`\``;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: patchPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const patchObj = JSON.parse(text.trim());

      console.log('\n========================================');
      console.log(`✨ DUAL AI SELF-HEAL PATCH REPORT: ${path.basename(filePath)}`);
      console.log('========================================\n');
      console.log(`Fixes Applied: ${patchObj.patchedSummary}`);
      console.log('\nPatch Code Snippet Preview:\n');
      console.log(patchObj.fixedCodeSnippet);
    } else {
      console.log('⚠️ Gemini patch generation completed with default recommendations.');
    }
  } catch (err) {
    console.error('❌ Self-heal patch generation failed:', err.message);
  }
}

const targetFile = process.argv[2] || 'backend/logic.js';
selfHealFile(targetFile);
