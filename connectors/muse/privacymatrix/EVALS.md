# PrivacyMatrix — end-to-end tests for Meta review

All commands are plain HTTPS against the live endpoint; no credentials needed. Replace
`https://mcp.barbaros.dev` with `http://127.0.0.1:8101` for local testing before deploy.

## 1. Initialize

```bash
curl -sS --http1.1 -m 20 -X POST 'https://mcp.barbaros.dev/privacymatrix/mcp' \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"muse","version":"1.0.0"}}}'
```

Expect: one JSON object, `result.serverInfo.name` = `"privacymatrix"`.

## 2. Tool list

```bash
curl -sS -X POST 'https://mcp.barbaros.dev/privacymatrix/mcp' \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

Expect: 7 tools — `list_apps`, `list_questions`, `get_answer`, `app_report`, `compare_apps`, `best_apps_for`, `search`.

## 3. get_answer — quoted, sourced, dated

```bash
curl -sS -X POST 'https://mcp.barbaros.dev/privacymatrix/mcp' \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_answer","arguments":{"app":"ChatGPT","question":"does it train on my chats"}}}'
```

Expect: `structuredContent.answer.value` = `"no"`, a non-empty `quote`, an `evidence_url` starting with
`https://help.openai.com`, and the text response contains "Not legal advice".

## 4. compare_apps — three apps, one question

```bash
curl -sS -X POST 'https://mcp.barbaros.dev/privacymatrix/mcp' \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"compare_apps","arguments":{"apps":["Claude","Gemini","ChatGPT"],"questions":["temporary_chat"]}}}'
```

Expect: a markdown table with one row and three value columns, plus a source URL per app underneath.

## 5. Unknown-value handling

Call `app_report` for any app, find a question whose `answer.value` is `"unknown"`, then call `get_answer`
for that same app/question pair. Expect the text response to say the documents do not address the question
— never "no."

## 6. GET returns 405, not a hang

```bash
curl -sS -o /dev/null -w '%{http_code}\n' 'https://mcp.barbaros.dev/privacymatrix/mcp'
```

Expect: `405`. This confirms the host is reachable and the stateless design is intentional (there is no
session for `GET` to resume).

## 7. No-auth proof

Every call above succeeds with zero credentials, cookies, or API keys — confirming the "Authentication
methods" left unchecked on the submission form is accurate.

## 8. Static docs

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://mcp.barbaros.dev/privacymatrix/muse.md
curl -sS -o /dev/null -w '%{http_code}\n' https://mcp.barbaros.dev/privacymatrix/llms.txt
curl -sS -o /dev/null -w '%{http_code}\n' https://mcp.barbaros.dev/healthz
```

Expect: `200`, `200`, `200`; `/healthz` body has `"ok":true`.
