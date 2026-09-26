# Unpolished — end-to-end checks

No credentials needed. Use `http://127.0.0.1:8101` instead of `https://mcp.barbaros.dev` to test locally.

## 1. Initialize

```bash
curl -sS --http1.1 -m 20 -X POST 'https://mcp.barbaros.dev/unpolished/mcp' \
  -H 'Content-Type: application/json' -H 'Accept: application/json' -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"muse","version":"1.0.0"}}}'
```

Expect one JSON object with `result.serverInfo.name` = `"unpolished"`.

## 2. Tool list

Expect exactly two tools: `polish_check`, `list_tells`.

## 3. polish_check finds a measured habit

```bash
curl -sS -X POST 'https://mcp.barbaros.dev/unpolished/mcp' \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"polish_check","arguments":{"text":"In this essay we delve into the topic."}}}'
```

Expect a habit `delve` with `people_pct` 0.2, `model_pct` 19.4, `model` "GPT-4", and an excerpt containing
"delve".

## 4. Plain writing comes back Raw

`polish_check` with `"I went to the shop and they'd run out of bread."`: expect `level` = `"raw"`, no habits.

## 5. A myth is reported, not counted

`polish_check` with `"Moreover, the bus was late."`: expect `moreover` under `myths` and `total` = 0.

## 6. Every answer carries the note

Every response text contains "not evidence that anyone used AI".

## 7. list_tells

`list_tells` with `{"query":"dash"}`: expect the long dash under `myths`.

## 8. Limits and transport

- Text over 20,000 characters: a tool error, not a crash.
- `GET https://mcp.barbaros.dev/unpolished/mcp` returns 405.
- `https://mcp.barbaros.dev/unpolished/muse.md` and `/unpolished/llms.txt` return 200.
