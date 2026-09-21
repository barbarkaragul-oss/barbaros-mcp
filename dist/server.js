import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { initData, getData } from './connectors/privacymatrix/data.js';
import { registerPrivacyMatrixTools } from './connectors/privacymatrix/tools.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = path.join(__dirname, 'connectors', 'privacymatrix', 'static');
const PORT = Number(process.env.PORT ?? 8101);
const SERVER_VERSION = '0.1.0';
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
// express.json's default error handler leaks stack traces and file paths in an
// HTML page; replace malformed-body / too-large errors with a clean JSON-RPC error.
app.use((err, _req, res, next) => {
    if (err && typeof err === 'object' && 'type' in err) {
        const type = err.type;
        if (type === 'entity.parse.failed') {
            res.status(400).json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error: invalid JSON' }, id: null });
            return;
        }
        if (type === 'entity.too.large') {
            res.status(413).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Request body too large' }, id: null });
            return;
        }
    }
    next(err);
});
// CORS: this is a public, read-only, unauthenticated API meant to be called
// from Muse's cloud and from browsers; allow any origin.
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Protocol-Version, MCP-Protocol-Version');
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }
    next();
});
// ---- minimal per-IP rate limit (defense in depth; nginx also limits) ----
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const hits = new Map();
function rateLimit(req, res, next) {
    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
        hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        next();
        return;
    }
    entry.count += 1;
    if (entry.count > RATE_LIMIT_MAX) {
        res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000).toString());
        res.status(429).json({ error: 'rate_limited', message: 'Too many requests, slow down.' });
        return;
    }
    next();
}
// periodic cleanup so the map doesn't grow forever
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
        if (now > entry.resetAt)
            hits.delete(ip);
    }
}, RATE_LIMIT_WINDOW_MS).unref();
function accessLog(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        // deliberately no request body / query args in the log
        console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
    });
    next();
}
app.use(accessLog);
// The MCP spec requires the client's Accept header to list both application/json
// and text/event-stream, and the SDK enforces that strictly. Muse's egress proxy
// ("Hatch") has been reported to send only `Accept: application/json` and to hang
// on an SSE response. We always answer with a single JSON body regardless
// (enableJsonResponse below), so it is safe to normalize a client's Accept header
// here rather than reject a real caller over a header omission.
function normalizeAcceptHeader(req) {
    const raw = req.headers.accept;
    const current = Array.isArray(raw) ? raw.join(',') : raw ?? '';
    const hasJson = current.includes('application/json');
    const hasSse = current.includes('text/event-stream');
    if (!hasJson || !hasSse) {
        const parts = [current, !hasJson ? 'application/json' : '', !hasSse ? 'text/event-stream' : ''].filter(Boolean);
        req.headers.accept = parts.join(', ');
    }
}
// ---- PrivacyMatrix MCP endpoint (stateless streamable HTTP, JSON responses) ----
app.post('/privacymatrix/mcp', rateLimit, async (req, res) => {
    try {
        normalizeAcceptHeader(req);
        const server = new McpServer({ name: 'privacymatrix', version: SERVER_VERSION }, {
            instructions: 'PrivacyMatrix answers privacy questions about 28 consumer AI assistant apps (does it train on my ' +
                'chats, can I delete my data, is there an incognito mode, etc). Every answer quotes the vendor\'s own ' +
                'privacy policy or help pages, with the source URL and the date it was last verified. Always show the ' +
                'quote and the source URL in your reply, and say this is not legal advice.',
        });
        registerPrivacyMatrixTools(server);
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // stateless: no session management
            enableJsonResponse: true, // single JSON body, no SSE (required by Muse's egress proxy)
        });
        res.on('close', () => {
            transport.close();
            server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (err) {
        console.error('[privacymatrix/mcp] error:', err);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal server error' },
                id: null,
            });
        }
    }
});
// GET/DELETE are not supported in stateless mode; Muse's Hatch proxy treats a
// clean 405 (rather than a hang or connection reset) as "the host is up".
app.get('/privacymatrix/mcp', (_req, res) => {
    res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed. POST JSON-RPC requests to this endpoint.' },
        id: null,
    });
});
app.delete('/privacymatrix/mcp', (_req, res) => {
    res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed. This server is stateless; there is no session to delete.' },
        id: null,
    });
});
// ---- static/reference endpoints for reviewers and for Muse itself ----
async function serveStatic(fileName, contentType) {
    return async (_req, res) => {
        try {
            const text = await readFile(path.join(STATIC_DIR, fileName), 'utf-8');
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=300');
            res.send(text);
        }
        catch (err) {
            console.error(`[static] failed to read ${fileName}:`, err);
            res.status(500).send('Internal server error');
        }
    };
}
app.get('/privacymatrix/', await serveStatic('index.html', 'text/html; charset=utf-8'));
app.get('/privacymatrix/muse.md', await serveStatic('muse.md', 'text/markdown; charset=utf-8'));
app.get('/privacymatrix/llms.txt', await serveStatic('llms.txt', 'text/plain; charset=utf-8'));
app.get('/healthz', (_req, res) => {
    try {
        const data = getData();
        res.json({ ok: true, data_generated_at: data.generated_at, data_source: data.source, loaded_at: data.loaded_at });
    }
    catch {
        res.status(503).json({ ok: false, error: 'data not loaded' });
    }
});
app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
});
// final safety net: never leak a stack trace or file path to a client
app.use((err, _req, res, _next) => {
    console.error('[unhandled]', err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'internal_server_error' });
    }
});
export { app };
async function main() {
    await initData();
    app.listen(PORT, '127.0.0.1', () => {
        console.log(`barbaros-mcp listening on 127.0.0.1:${PORT}`);
    });
}
// Only auto-start the HTTP listener when this file is run directly (production
// entrypoint / `npm run dev`). When imported by tests, the caller decides when
// to call initData() and how to listen, so importing this module has no side effect.
const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
    main().catch((err) => {
        console.error('fatal startup error:', err);
        process.exit(1);
    });
}
