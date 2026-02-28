const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const server = fs.readFileSync('server.js', 'utf8');

const regex = /import.*from\s+['"]([a-z0-9\-]+)['"]|require\(['"]([a-z0-9\-]+)['"]\)/g;
const deps = new Set();
let match;
while ((match = regex.exec(server)) !== null) {
  deps.add(match[1] || match[2]);
}

const builtins = ['fs', 'path', 'http', 'https', 'crypto', 'os', 'child_process'];
const missing = [...deps].filter(d => !pkg.dependencies[d] && !builtins.includes(d) && !d.startsWith('.') && !d.startsWith('/'));

console.log('Missing deps:', missing);
