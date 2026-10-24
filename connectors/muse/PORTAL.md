# Muse developer portal — submission requirements (both connectors)

The portal (platform.muse.ai → Your submissions) asks three things for each submission:
Business verification, Data processing questionnaire, Integration credentials. Answers below are written
from what the server actually does (checked 2026-10-24) and match barbaros.dev/privacy.html, which the
docs require (§5.3: "Ensure your answers reflect how the connector works and match your privacy policy").

Docs: https://platform.muse.ai/docs (§4.2 data use, §4.4 security, §5.2–5.5 requirements, §3.2 classification).

---

## 1. Business verification (§5.2) — only the developer can do this

The portal asks for business information and evidence of "your organization and your authority to submit
the connector". The docs only say "organization"; they do not say whether an individual developer qualifies.
Open "Start" to see what it accepts. Keep every detail identical to the listing and the website:

| Field | Value used everywhere so far |
|---|---|
| Developer / company | Barbaros Karagülmez (barbaros.dev) |
| Website | https://barbaros.dev |
| Country | Turkey (Tekirdağ) — as on barbaros.dev footer |
| Support | https://barbaros.dev/#contact |
| Security contact | the Meta account email used for the submission |
| Privacy policy | https://barbaros.dev/privacy.html |
| Terms | https://barbaros.dev/terms.html |
| Maintainer | Barbaros Karagülmez |
| Brand assets | own products; source on github.com/barbarkaragul-oss |

---

## 2. Data processing questionnaire (§5.3)

### PrivacyMatrix

- **What data the connector accesses and why:** only the tool arguments the user's request implies: an app
  name, a privacy question, or a search string. They are used only to look up the answer. The connector has
  no access to the user's account, messages, contacts, location or any Muse data.
- **Personal data:** none required. A free-text search string could in principle contain something personal
  if the user typed it; it is used only to search the public dataset and is not kept.
- **How it is protected:** HTTPS only (plain HTTP is redirected to HTTPS). The request is answered in memory and discarded. No
  database, no user accounts, no credentials. Request bodies are never logged.
- **Who it is shared with:** no one. No third parties, no analytics, no advertising.
- **How long it is kept:** request contents are not kept at all. Operational logs: nginx access logs (IP
  address, path, status) 14 days; application logs (time, path, status, duration; no IP, no content) up to
  30 days.
- **How it is deleted:** request contents are never written; logs rotate and are deleted automatically
  after the periods above.
- **Secondary use:** none. No sale, no advertising, no profiling, no model training.
- **Data the connector returns:** quotes from AI vendors' public privacy policies and help pages, with
  source URLs and verification dates. No user data.

### Unpolished

- **What data the connector accesses and why:** `polish_check` receives the text the user asks it to check
  (their own English writing, up to 20,000 characters), used only to count writing habits for that request.
  `list_tells` receives at most a word to look up.
- **Personal data:** the checked text may contain personal information because it is the user's own
  writing. It is processed only in memory, only to answer that request.
- **How it is protected:** HTTPS only. Scanned in memory with fixed patterns; no model is called and no
  third party is contacted. Request bodies, and so the checked text, are never logged by the application
  or by nginx.
- **Who it is shared with:** no one. The response goes back only to the caller and contains counts and up
  to three short excerpts of the user's own text around each match.
- **How long it is kept:** the text is discarded as soon as the response is sent. Operational logs as for
  PrivacyMatrix (nginx 14 days with IP; application up to 30 days without IP or content).
- **How it is deleted:** the text is never written to disk; logs rotate automatically.
- **Secondary use:** none. No sale, no advertising, no profiling, no model training.

### Both

- **Security incidents:** would be reported to vendor-incident@meta.com within 48 hours (§4.8).
- **Requests from authorities:** handled by legal review before any disclosure, as stated on
  barbaros.dev/privacy.html, section "Requests from authorities and third parties" (added 2026-10-24). The
  questionnaire was submitted with "No documented process" before this section existed; "Legal review" now
  matches the policy.
- **Revocation:** there are no accounts or tokens, so there is nothing to revoke; a user stops all
  processing by not calling the connector.

---

## 3. Integration credentials and tool documentation (§5.4, §5.5)

| | PrivacyMatrix | Unpolished |
|---|---|---|
| Endpoint | https://mcp.barbaros.dev/privacymatrix/mcp | https://mcp.barbaros.dev/unpolished/mcp |
| Transport | MCP Streamable HTTP, JSON responses, protocol 2025-06-18 | same |
| Authentication | none | none |
| Scopes | none | none |
| Credentials | none required | none required |
| Environment | production (the same endpoint serves review and users) | same |
| Test account (§5.5) | not applicable: no accounts exist, every tool works without sign-in | same |
| Tool documentation | https://mcp.barbaros.dev/privacymatrix/muse.md | https://mcp.barbaros.dev/unpolished/muse.md |

Every tool is **Read** (§3.2): it retrieves information without changing data, account state or
permissions. None is a write or a sensitive write. No tool has side effects.

| Connector | Tool | Class | Side effects |
|---|---|---|---|
| PrivacyMatrix | list_apps, list_questions, get_answer, app_report, compare_apps, best_apps_for, search | Read | none |
| Unpolished | polish_check, list_tells | Read | none |

Errors and limits (both): invalid arguments return an MCP tool error (`isError: true`) with a message;
unknown apps or questions return a helpful text answer listing valid ones; bodies over 64 KB get HTTP 413;
about 10 requests/second per client, then HTTP 429 with `Retry-After`; GET on the endpoint returns 405 (the
server is stateless). Unpolished rejects text over 20,000 characters with a tool error.

If the portal has a free-text box, paste:

```
No authentication: the connector is public and read-only, and every tool works without an account, API key
or OAuth. There are no credentials, scopes or test accounts to provide. The endpoint above is the production
endpoint used for review and for users. All tools are classified Read with no side effects; full tool
documentation (inputs, outputs, classification, errors, rate limits) is at the documentation URL above.
```
