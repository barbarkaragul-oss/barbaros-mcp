# PrivacyMatrix × Muse — security and data note

For Meta functional / security / legal review.

## Trust boundary

Muse talks to PrivacyMatrix over public HTTPS. The connector returns quoted privacy-policy text and source
URLs. There is no purchase, no account, and no write path.

```
User → Muse VM → https://mcp.barbaros.dev/privacymatrix/mcp → static, GitHub-sourced dataset
```

Allowed hosts: `mcp.barbaros.dev`, `barbaros.dev`.

## Auth

No credential of any kind. There is nothing to put in Muse's Secure Credentials Store for this connector.
The connector will never ask a user for a password, API key, or login.

## Data the connector sees

Tool arguments only: an app name/id, a question id or natural-language question text, or a free-text search
string — whatever the user's own request already implies. The connector does not receive, store, or log
Meta account ids, Gmail contents, calendar data, or any other data outside those three argument types.

**Nothing is written.** The connector has no database and no write tools. Requests are served entirely from
an in-memory snapshot refreshed from a public GitHub repository every 6 hours; a request never touches disk
beyond process memory.

## Logging

Access logs record timestamp, HTTP method, path, status code, and response time. Tool arguments and response
bodies are never logged. Logs are retained 14 days (standard nginx rotation) and are used only for abuse
detection and reliability.

## Availability integrity (Muse Connector Terms §4.1 — accuracy)

Every cell in the dataset is a direct quote with a source URL and a verification date. A GitHub Action
re-fetches every source weekly and re-checks every quote; a quote that can no longer be found demotes that
cell to `unknown` rather than leaving a stale answer standing. The connector serves this dataset live (refreshed
every 6 hours), so a correction to the dataset reaches Muse without a connector redeploy.

## Privacy notice (Muse Connector Terms §4.3(c))

Public privacy notice: https://barbaros.dev/privacy.html (section "Connectors and APIs"). Public terms:
https://barbaros.dev/terms.html (section "Connector and API use"). Both describe exactly what this connector
processes (tool arguments only, no personal data, no account) and are kept current with the live connector.

## Security incident contact (Muse Connector Terms §4.3(b) — 48-hour notice)

Contact for security review or incident notification: through https://barbaros.dev/#contact, or the work
email used on the Muse developer account.

## Scope (Muse Connector Terms — no undisclosed endpoints)

Exactly seven read-only tools, all documented in [muse.md](./muse.md) and
[llms.txt](https://mcp.barbaros.dev/privacymatrix/llms.txt): `list_apps`, `list_questions`, `get_answer`,
`app_report`, `compare_apps`, `best_apps_for`, `search`. No other endpoint is exposed to Muse beyond the
static docs (`/privacymatrix/`, `/privacymatrix/muse.md`, `/privacymatrix/llms.txt`) and a health check
(`/healthz`).

## Abuse

Public, stateless catalogue. A per-IP rate limit (about 60 requests/minute) applies at both the application
and nginx layers; excess requests receive `429` with `Retry-After`. Oversized request bodies (>64 KB) are
rejected with `413`. The connector does not scrape or forward requests to any third party.

## Not legal advice

The dataset summarizes what vendors publish, as of the verification date shown, for the consumer plan with
default settings. Every tool response says so. This connector does not practice law, and its tool
descriptions instruct Muse to present it that way.
