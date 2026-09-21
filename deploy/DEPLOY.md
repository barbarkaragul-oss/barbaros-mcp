# Deploy runbook — barbaros-mcp / PrivacyMatrix

Do not run any of this without the user's go-ahead. Everything up to this point (repo, tests, connector
package) is local-only and has no effect on the live VPS or barbaros.dev.

## Prerequisites (user does these)

1. **DNS**: in Cloudflare, add an A record `mcp.barbaros.dev` → `65.109.135.230`, proxy **off** (grey cloud,
   DNS-only). Confirm with `nslookup mcp.barbaros.dev` before continuing.
2. **Go-ahead** to touch the VPS and the public barbaros.dev pages.

## 1. Ship the code

```bash
# local
cd C:\Users\barba\barbaros-mcp
git init && git add -A && git commit -m "barbaros-mcp: PrivacyMatrix MCP connector for Muse"
git remote add origin https://github.com/barbarkaragul-oss/barbaros-mcp.git
git push -u origin main
```

```bash
# on the VPS (root@65.109.135.230:2222)
cd /var/www
git clone https://github.com/barbarkaragul-oss/barbaros-mcp.git
cd barbaros-mcp
npm ci --omit=dev       # dist/ is committed to git; no build step needed here
mkdir -p /var/log/barbaros-mcp
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

`dist/` is committed on purpose so the VPS never needs `typescript`/`tsx`/`vitest` installed. After any
change to `src/`, run `npm run build` locally and commit the updated `dist/` before pushing.

## 2. nginx + rate limit + TLS

```bash
# on the VPS
cp deploy/mcp-ratelimit.conf /etc/nginx/conf.d/mcp-barbaros-ratelimit.conf
cp deploy/mcp.barbaros.dev.conf /etc/nginx/sites-available/mcp.barbaros.dev
ln -s /etc/nginx/sites-available/mcp.barbaros.dev /etc/nginx/sites-enabled/mcp.barbaros.dev
nginx -t && systemctl reload nginx
certbot --nginx -d mcp.barbaros.dev
```

## 3. Verify from outside the VPS

Run every command in [`connectors/muse/privacymatrix/EVALS.md`](../connectors/muse/privacymatrix/EVALS.md)
against `https://mcp.barbaros.dev`. Also test with the Claude Code MCP client as a second, independent
client:

```bash
claude mcp add --transport http privacymatrix https://mcp.barbaros.dev/privacymatrix/mcp
```

## 4. barbaros.dev privacy/terms pages

On the VPS, insert [`privacy-addendum.html`](./privacy-addendum.html) into
`/var/www/barbaros-dev/privacy.html` right before `</article>`, and
[`terms-addendum.html`](./terms-addendum.html) into `/var/www/barbaros-dev/terms.html` the same way. Update
both pages' `Last updated:` line to the deploy date. Read each file after editing to confirm the insertion
landed correctly before moving on — do not assume a sed one-liner matched exactly right.

## 5. Test in Muse itself

Paste [`connectors/muse/privacymatrix/INSTALL.md`](../connectors/muse/privacymatrix/INSTALL.md) into a Muse
chat (user's own Muse account) and confirm a real answer comes back with a quote and source URL.

## 6. Submit the form

The user does this step personally (signed into their own Meta work email). Text is in
[`connectors/muse/privacymatrix/SUBMISSION.md`](../connectors/muse/privacymatrix/SUBMISSION.md).

## 7. After submission

Record the confirmation / request id in `SUBMISSION.md` and in memory
(`muse-connector-privacymatrix-plan-2026-09-21.md`).
