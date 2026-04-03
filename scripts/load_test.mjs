#!/usr/bin/env node
/**
 * Lightweight load test: HTTP p50/p95 + optional Socket.IO latency probe.
 * Usage:
 *   API_BASE=https://your-backend.onrender.com node scripts/load_test.mjs
 *   API_BASE=http://localhost:3001 CONCURRENCY=50 DURATION_MS=30000 node scripts/load_test.mjs
 *   SOCKET_PROBE=1 JWT=eyJhbG... node scripts/load_test.mjs   # needs a real Bearer token for socket auth
 *
 * Phase D — synthetic agent / transport scenario (no auth required for public endpoints):
 *   SCENARIO=agent_transport API_BASE=http://localhost:3001 node scripts/load_test.mjs
 * Optional: JWT=... for agent book/status probes (or AGENT_API_KEY + AGENT_USER_ID with server env).
 *
 * Requires: npm i socket.io-client (peer; install in repo root or set NODE_PATH)
 */

import http from 'http';
import https from 'https';
import { performance } from 'perf_hooks';

const API_BASE = (process.env.API_BASE || process.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const PATH = process.env.TEST_PATH || '/api/health';
const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '20', 10));
const DURATION_MS = Math.max(1000, parseInt(process.env.DURATION_MS || '15000', 10));
const SOCKET_PROBE = process.env.SOCKET_PROBE === '1';
const JWT = process.env.JWT || '';
const SCENARIO = process.env.SCENARIO || '';
const AGENT_API_KEY = process.env.AGENT_API_KEY || '';
const AGENT_USER_ID = process.env.AGENT_USER_ID || 'loadtest-agent-user';

async function fetchJson(url, opts = {}) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { ok: res.ok, status: res.status, ms: performance.now() - t0, body };
  } catch (e) {
    return { ok: false, status: 0, ms: performance.now() - t0, error: String(e) };
  }
}

/** Synthetic multi-step “agent market” probe: features → find vehicles → stop-demand → optional book/status. */
async function runAgentTransportScenario() {
  const fromStop = process.env.AGENT_FROM_STOP || 'A';
  const toStop = process.env.AGENT_TO_STOP || 'H';
  console.log('\n--- SCENARIO: agent_transport ---');
  console.log(`segment: ${fromStop} → ${toStop}`);

  const r1 = await fetchJson(`${API_BASE}/api/v1/transport/features`);
  console.log(`GET /api/v1/transport/features  ${r1.status}  ${r1.ms.toFixed(1)}ms`, r1.ok ? '' : r1.error || r1.body);

  const r2 = await fetchJson(`${API_BASE}/api/v1/transport/find-upcoming-vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fromStop, toStop, maxEtaMinutes: 30 }),
  });
  console.log(`POST find-upcoming-vehicles  ${r2.status}  ${r2.ms.toFixed(1)}ms`);
  const vehicles = r2.body?.data?.vehicles || r2.body?.vehicles;
  if (Array.isArray(vehicles)) console.log(`  vehicles returned: ${vehicles.length}`);

  const r3 = await fetchJson(`${API_BASE}/api/v1/transport/stop-demand?stops=${encodeURIComponent(`${fromStop},${toStop}`)}`);
  console.log(`GET stop-demand  ${r3.status}  ${r3.ms.toFixed(1)}ms`);

  const r4 = await fetchJson(`${API_BASE}/api/metrics/latency`);
  console.log(`GET /api/metrics/latency  ${r4.status}  ${r4.ms.toFixed(1)}ms`);

  if (JWT || AGENT_API_KEY) {
    const headers = {
      'Content-Type': 'application/json',
      'x-idempotency-key': `loadtest-${Date.now()}`,
    };
    if (JWT) headers.Authorization = `Bearer ${JWT}`;
    if (AGENT_API_KEY) {
      headers['x-agent-api-key'] = AGENT_API_KEY;
      headers['x-user-id'] = AGENT_USER_ID;
    }
    const driverHint = vehicles?.[0]?.driverId || process.env.AGENT_DRIVER_ID;
    const r5 = await fetchJson(`${API_BASE}/api/v1/transport/book-segment-ride`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fromStop,
        toStop,
        driverId: driverHint,
        passengerCount: 1,
        totalPrice: 24,
        paymentMethod: 'ONLINE',
      }),
    });
    console.log(`POST book-segment-ride  ${r5.status}  ${r5.ms.toFixed(1)}ms`);
    const tid = r5.body?.data?.ticket?.id || r5.body?.data?.orderId || r5.body?.ticket?.id;
    if (tid) {
      const statusHeaders = {};
      if (JWT) statusHeaders.Authorization = `Bearer ${JWT}`;
      if (AGENT_API_KEY) {
        statusHeaders['x-agent-api-key'] = AGENT_API_KEY;
        statusHeaders['x-user-id'] = AGENT_USER_ID;
      }
      const r6 = await fetchJson(`${API_BASE}/api/v1/transport/order/${encodeURIComponent(tid)}/status`, {
        headers: statusHeaders,
      });
      console.log(`GET order status  ${r6.status}  ${r6.ms.toFixed(1)}ms`);
    }
  } else {
    console.log('(Skip book/status: set JWT or AGENT_API_KEY matching server AGENT_API_KEY)');
  }
  console.log('--- end agent_transport ---\n');
}

function requestOnce(url) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(
      url,
      { method: 'GET', timeout: 30000 },
      (res) => {
        res.resume();
        res.on('end', () => resolve(performance.now() - t0));
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function runHttpLoad() {
  const latencies = [];
  const deadline = Date.now() + DURATION_MS;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (Date.now() < deadline) {
      const ms = await requestOnce(`${API_BASE}${PATH}`);
      if (ms != null) latencies.push(ms);
    }
  });
  await Promise.all(workers);
  latencies.sort((a, b) => a - b);
  const n = latencies.length;
  console.log('\n--- HTTP load ---');
  console.log(`URL: ${API_BASE}${PATH}`);
  console.log(`Samples: ${n}  concurrency: ${CONCURRENCY}  duration: ${DURATION_MS}ms`);
  if (n) {
    console.log(`p50: ${percentile(latencies, 50).toFixed(1)} ms`);
    console.log(`p95: ${percentile(latencies, 95).toFixed(1)} ms`);
    console.log(`p99: ${percentile(latencies, 99).toFixed(1)} ms`);
    console.log(`min: ${latencies[0].toFixed(1)} ms  max: ${latencies[n - 1].toFixed(1)} ms`);
  }
}

async function runSocketProbe() {
  if (!JWT) {
    console.log('\n--- Socket probe skipped (set JWT=...) ---');
    return;
  }
  let io;
  try {
    ({ io } = await import('socket.io-client'));
  } catch {
    console.log('\n--- Socket probe: install socket.io-client (npm i socket.io-client) ---');
    return;
  }
  const t0 = performance.now();
  const socket = io(API_BASE, {
    transports: ['websocket'],
    auth: { token: JWT },
    reconnection: false,
    timeout: 15000,
  });
  await new Promise((resolve) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', () => resolve());
    setTimeout(resolve, 15000);
  });
  const connectMs = performance.now() - t0;
  const ok = socket.connected;
  socket.disconnect();
  console.log('\n--- Socket.IO handshake ---');
  console.log(`connected: ${ok}  handshake_ms: ${connectMs.toFixed(1)}`);
}

if (SCENARIO === 'agent_transport') {
  await runAgentTransportScenario();
} else {
  await runHttpLoad();
  if (SOCKET_PROBE) await runSocketProbe();
}
