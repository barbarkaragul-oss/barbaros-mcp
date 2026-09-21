import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/server.js';
import { initData } from '../src/connectors/privacymatrix/data.js';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await initData();
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('failed to bind test server');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
});

const mcpUrl = () => `${baseUrl}/privacymatrix/mcp`;
const jsonHeaders = { 'Content-Type': 'application/json', Accept: 'application/json' };

describe('HTTP transport', () => {
  it('initialize returns one JSON object, not an SSE stream', async () => {
    const res = await fetch(mcpUrl(), {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe('privacymatrix');
  });

  it('accepts a client that only sends Accept: application/json (no text/event-stream)', async () => {
    // this is the header shape reported for Muse's egress proxy in the field
    const res = await fetch(mcpUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.tools.length).toBe(7);
  });

  it('GET /privacymatrix/mcp returns 405, not a hang', async () => {
    const res = await fetch(mcpUrl(), { method: 'GET' });
    expect(res.status).toBe(405);
  });

  it('DELETE /privacymatrix/mcp returns 405', async () => {
    const res = await fetch(mcpUrl(), { method: 'DELETE' });
    expect(res.status).toBe(405);
  });

  it('malformed JSON returns a clean JSON-RPC error, no stack trace', async () => {
    const res = await fetch(mcpUrl(), { method: 'POST', headers: jsonHeaders, body: '{not json' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/Parse error/);
  });

  it('oversized body is rejected with 413', async () => {
    const big = 'a'.repeat(70_000);
    const res = await fetch(mcpUrl(), {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'x', params: { pad: big } }),
    });
    expect(res.status).toBe(413);
  });

  it('unknown path returns a 404 JSON body, not the default Express HTML page', async () => {
    const res = await fetch(`${baseUrl}/nope`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('not_found');
  });

  it('serves the static brief, tool contract, and index page', async () => {
    const [index, brief, contract] = await Promise.all([
      fetch(`${baseUrl}/privacymatrix/`),
      fetch(`${baseUrl}/privacymatrix/muse.md`),
      fetch(`${baseUrl}/privacymatrix/llms.txt`),
    ]);
    expect(index.status).toBe(200);
    expect(brief.status).toBe(200);
    expect(contract.status).toBe(200);
    expect(await brief.text()).toContain('mcp.barbaros.dev/privacymatrix/mcp');
  });

  it('/healthz reports data status', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('CORS: responses allow any origin', async () => {
    const res = await fetch(mcpUrl(), {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('rate limits after 60 requests per minute on the MCP endpoint', async () => {
    const call = () =>
      fetch(mcpUrl(), { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
    const results: number[] = [];
    for (let i = 0; i < 65; i++) {
      // sequential on purpose: this test's rate-limit bucket is per-IP, and
      // 127.0.0.1 is shared across this whole suite, so this must run last.
      const res = await call();
      results.push(res.status);
    }
    expect(results.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});
