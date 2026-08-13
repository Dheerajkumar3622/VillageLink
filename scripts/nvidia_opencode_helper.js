const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

if (!NVIDIA_API_KEY) {
  console.error('❌ ERROR: NVIDIA_API_KEY is missing in .env.local');
  process.exit(1);
}

const https = require('https');

/**
 * Send prompt to NVIDIA API
 * @param {string} prompt 
 * @param {string} model 
 * @param {string} systemPrompt 
 */
function queryNvidia(prompt, model = 'meta/llama-3.1-8b-instruct', systemPrompt = 'You are an expert software engineer and code auditor.') {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024
    });

    const options = {
      hostname: 'integrate.api.nvidia.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 40000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve(data.choices?.[0]?.message?.content || 'No response generated.');
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${e.message}`));
          }
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out (40s)'));
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

// Command-line execution
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    console.log('🔄 Testing NVIDIA API Key connectivity...');
    queryNvidia('Respond with "NVIDIA API key is valid and working!" if you receive this message.', 'meta/llama-3.1-8b-instruct')
      .then(reply => {
        console.log('✅ Response received from NVIDIA NIM:');
        console.log(reply.trim());
      })
      .catch(err => {
        console.error('❌ Test failed detail:', err);
        process.exit(1);
      });
  } else if (args[0]) {
    const prompt = args.join(' ');
    console.log(`🚀 Querying NVIDIA NIM (${prompt.substring(0, 50)}...)...`);
    queryNvidia(prompt)
      .then(reply => console.log('\n--- NVIDIA Model Response ---\n' + reply))
      .catch(() => process.exit(1));
  } else {
    console.log('Usage: node scripts/nvidia_opencode_helper.js --test OR node scripts/nvidia_opencode_helper.js "Your prompt here"');
  }
}

module.exports = { queryNvidia };
