const fs = require('fs');
const path = require('path');
const { queryNvidia } = require('./nvidia_opencode_helper');

async function auditFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  console.log(`🔍 Auditing file with NVIDIA OpenCode AI: ${filePath}...`);

  const prompt = `Perform a comprehensive code review and security audit for the following file (${path.basename(filePath)}).
Focus on:
1. Security vulnerabilities & Injection risks
2. Performance bottlenecks & Memory leaks
3. Code quality, edge cases & best practices
4. Key recommendations with code fixes

File Content:
\`\`\`
${content}
\`\`\``;

  try {
    const auditReport = await queryNvidia(prompt, 'meta/llama-3.1-8b-instruct', 'You are an elite cybersecurity analyst and senior software architect.');
    console.log('\n========================================');
    console.log(`🛡️  NVIDIA CODE AUDIT REPORT: ${path.basename(filePath)}`);
    console.log('========================================\n');
    console.log(auditReport);
  } catch (err) {
    console.error('❌ Audit failed:', err.message);
  }
}

const target = process.argv[2] || 'backend/server.js';
auditFile(target);
