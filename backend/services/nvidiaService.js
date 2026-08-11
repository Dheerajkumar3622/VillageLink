import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get NVIDIA API Key from process.env or .env.local
function getNvidiaApiKey() {
    if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;
    
    try {
        const envPath = path.resolve(__dirname, '../../.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(/NVIDIA_API_KEY\s*=\s*(.*)/);
            if (match && match[1]) {
                let key = match[1].trim();
                if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
                    key = key.slice(1, -1);
                }
                process.env.NVIDIA_API_KEY = key;
                return key;
            }
        }
    } catch (e) {
        console.warn('Failed to read .env.local for NVIDIA_API_KEY:', e.message);
    }
    return '';
}

/**
 * Query NVIDIA NIM API endpoint
 * @param {string} prompt 
 * @param {string} model 
 * @param {string} systemPrompt 
 * @returns {Promise<string>}
 */
export function queryNvidia(prompt, model = 'meta/llama-3.1-8b-instruct', systemPrompt = 'You are an expert software engineer and AI orchestrator.') {
    return new Promise((resolve, reject) => {
        const apiKey = getNvidiaApiKey();
        if (!apiKey) {
            return reject(new Error('NVIDIA_API_KEY is missing'));
        }

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
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            },
            timeout: 30000
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
                        reject(new Error(`Failed to parse NVIDIA response JSON: ${e.message}`));
                    }
                } else {
                    reject(new Error(`NVIDIA API Error ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('NVIDIA API Request timed out (30s)'));
        });

        req.on('error', (err) => reject(err));
        req.write(payload);
        req.end();
    });
}
