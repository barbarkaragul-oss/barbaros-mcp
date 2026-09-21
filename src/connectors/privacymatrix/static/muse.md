# PrivacyMatrix: Muse connector brief

Read this file first. It is the contract for building and running the PrivacyMatrix connector.

## What this service is

PrivacyMatrix answers one question over and over, for every consumer AI assistant: **what does the
vendor's own privacy policy actually say?** It covers 28 apps (ChatGPT, Claude, Gemini, Meta AI, Copilot,
Perplexity, Grok, and 21 others) across 14 privacy questions (training on your chats, opting out, memory
controls, self-service deletion, deletion timelines, incognito/temporary chat, ads, selling/sharing data,
human review of conversations, precise location, and a documented data-rights channel).

Every answer is a direct quote from the vendor's privacy policy, terms, or help pages, with the source URL
and the date it was last confirmed there. A GitHub Action re-checks every quote against its live source
weekly; if a quote can no longer be found, the cell is demoted to "unknown" rather than left stale. Silence
in a vendor's documents is always read as "unknown," never as "no."

**This is not legal advice.** It summarizes what vendors publish, as of the verification date shown, for the
consumer plan with default settings. Always show the user the quote and the source URL.

## Connection details

| Item | Value |
|---|---|
| Product | PrivacyMatrix |
| Developer | Barbaros Karagülmez (barbaros.dev) |
| Website | https://barbaros.dev/privacymatrix/ |
| Privacy policy | https://barbaros.dev/privacy.html |
| Terms | https://barbaros.dev/terms.html |
| Source (MIT) | https://github.com/barbarkaragul-oss/barbaros-mcp |
| Underlying dataset (MIT) | https://github.com/barbarkaragul-oss/privacymatrix |
| Agent brief (this file, raw) | https://mcp.barbaros.dev/privacymatrix/muse.md |
| Tool contract | https://mcp.barbaros.dev/privacymatrix/llms.txt |
| MCP endpoint | https://mcp.barbaros.dev/privacymatrix/mcp |
| MCP transport | Streamable HTTP JSON-RPC, JSON responses (no SSE) |
| Protocol version | 2025-06-18 |
| Auth | None. Do not ask the user for credentials. |
| Allowed hosts | `mcp.barbaros.dev`, `barbaros.dev` |
| Rate limit | ~60 requests/minute per client; 429 with `Retry-After` on excess |

### Transport rules (read this if the connection seems to hang)

This server answers `initialize` in well under a second. If a client's runtime seems to hang or time out,
the problem is almost always a streaming client waiting for Server-Sent Events that will never arrive — this
server always returns a single JSON object, never SSE.

1. Call with `Accept: application/json` (not `text/event-stream`).
2. Expect one JSON object in the response body. Do not wait for SSE comments or a keep-alive stream.
3. `GET https://mcp.barbaros.dev/privacymatrix/mcp` correctly returns **405**. That means the host is up;
   this server is stateless and has no session to resume with GET.
4. Timeout budget: 20 seconds is generous; typical responses return in well under 1 second.

Copy-paste initialize that works from the public internet:

```bash
curl -sS --http1.1 -m 20 -X POST 'https://mcp.barbaros.dev/privacymatrix/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"muse","version":"1.0.0"}}}'
```

Then call a tool:

```bash
curl -sS --http1.1 -m 20 -X POST 'https://mcp.barbaros.dev/privacymatrix/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_answer","arguments":{"app":"ChatGPT","question":"does it train on my chats"}}}'
```

## The seven tools

| Tool | Use it when | Key args |
|---|---|---|
| `list_apps` | "what apps are covered" | — |
| `list_questions` | "what questions can you answer" | — |
| `get_answer` | one app, one question | `app`, `question` |
| `app_report` | "tell me everything about X" | `app` |
| `compare_apps` | "compare X and Y" | `apps[]` (2-6), optional `questions[]` |
| `best_apps_for` | "which apps let me delete my data" | `question`, optional `value` |
| `search` | anything broader or fuzzy | `query` |

All tools are read-only. None require authentication, an account, or any user data beyond the arguments the
user's own request implies (an app name, a question, or a search string).

## Recipes

### A. "Does ChatGPT train on my conversations, and how do I opt out?"

1. `get_answer` app=`ChatGPT` question=`no_training_default`
2. `get_answer` app=`ChatGPT` question=`training_opt_out`
3. Show both quotes and both source URLs. Do not merge them into one claim.

### B. "Compare Claude, Gemini and ChatGPT on privacy"

1. `compare_apps` apps=`["Claude","Gemini","ChatGPT"]`
2. Present the table; note that "yes" is always the more privacy-protective answer.

### C. "Which AI apps have a real incognito mode?"

1. `best_apps_for` question=`temporary_chat` value=`yes`
2. List each app with its quote.

### D. "If I delete a chat, is it really gone?"

1. `get_answer` app=`<app>` question=`user_deletion`
2. `get_answer` app=`<app>` question=`deletion_timeline`
3. Report both; a self-service delete button and a fast purge timeline are two different facts.

### E. Handling "unknown"

If a cell's value is `unknown`, say the vendor's documents do not address the question — never state or imply
"no." This is a hard rule from the underlying dataset's own methodology.

## Reviewer links

| What | URL |
|---|---|
| Platform submit | https://muse.ai/platform |
| Source (this connector) | https://github.com/barbarkaragul-oss/barbaros-mcp |
| Underlying dataset | https://github.com/barbarkaragul-oss/privacymatrix |
| Interactive matrix (human-readable) | https://barbaros.dev/privacymatrix/ |
| Health check | https://mcp.barbaros.dev/healthz |
