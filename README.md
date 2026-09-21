# barbaros-mcp

Hosted MCP connectors for [barbaros.dev](https://barbaros.dev), built for the
[Meta Muse Connector Platform](https://muse.ai/platform).

Read-only, unauthenticated, stateless. No user data is collected or stored; each connector serves a public
dataset over the Model Context Protocol (Streamable HTTP, JSON responses — no SSE, since Muse's egress proxy
has been reported to hang on it).

## Connectors

| Connector | Endpoint | Dataset | Status |
|---|---|---|---|
| [PrivacyMatrix](./connectors/muse/privacymatrix/) | `/privacymatrix/mcp` | [privacymatrix](https://github.com/barbarkaragul-oss/privacymatrix) — 28 AI apps × 14 privacy questions, quote-sourced | ready to deploy |

More connectors (Unpolished AI-tell scan, WIROAM shell-portability check) are planned as separate mounts on
the same server; see `uygulama_plani.md` §7.

## Develop

```bash
npm install
npm run dev        # tsx watch, http://127.0.0.1:8101
npm test            # vitest
npm run build        # tsc + copy static/fallback assets into dist/
npm start            # node dist/server.js
```

Environment: `PORT` (default `8101`).

## Architecture

- `src/server.ts` — Express app. One MCP endpoint per connector, mounted under its own path
  (`/privacymatrix/mcp`), plus static docs (`/privacymatrix/muse.md`, `/privacymatrix/llms.txt`,
  `/privacymatrix/`) and a shared `/healthz`.
- Each POST to an MCP endpoint creates a fresh `McpServer` + `StreamableHTTPServerTransport`
  (`sessionIdGenerator: undefined`, `enableJsonResponse: true`) — stateless, no session to manage, single
  JSON response body.
- `src/connectors/<name>/data.ts` — loads the connector's dataset from its public GitHub repo (`raw.githubusercontent.com`)
  on startup and every 6 hours; falls back to a bundled snapshot (`fallback/*.json`) if the network is
  unavailable, so the server never starts empty.
- `src/connectors/<name>/tools.ts` — the MCP tools, registered on a per-request `McpServer`.

See [`connectors/muse/<name>/`](./connectors/muse/) for the Meta submission pack per connector (brief,
skill rules, install prompt, submission text, security note, e2e evals, icon).

## Deploy (VPS)

See [`deploy/`](./deploy/) for the nginx site config and pm2 process definition. Summary (full steps in
`uygulama_plani.md` §Adım F):

1. DNS: `mcp.barbaros.dev` → VPS IP (Cloudflare, DNS-only).
2. `git clone` to `/var/www/barbaros-mcp`, `npm ci --omit=dev`, `npm run build`.
3. `pm2 start deploy/ecosystem.config.cjs`, `pm2 save`.
4. `nginx -t` with `deploy/mcp.barbaros.dev.conf` in `sites-enabled`, then reload.
5. `certbot --nginx -d mcp.barbaros.dev`.
6. Verify with `connectors/muse/privacymatrix/EVALS.md`.

## License

MIT. The underlying [privacymatrix](https://github.com/barbarkaragul-oss/privacymatrix) dataset is also MIT.
