# Unpolished: Muse connector brief

Read this file first. It is the contract for building and running the Unpolished connector.

## What this service is

Unpolished checks a piece of English writing for the habits that language models use far more often than
people, and for the popular "AI words" that turn out to be myths. It is the polish check from the
[Unpolished](https://barbaros.dev/unpolished/) Chrome extension, offered as a tool.

It uses no model. Each habit comes with two measured rates: how often people use it and how often the model
that uses it most does. For example, "delve" appears in up to 0.2% of people's texts and up to 19.4% of
GPT-4's; "moreover" appears in 7.7% of people's texts and at most 5.3% of the models', so it is a myth. The
measurement, its data and its method are public: https://barbaros.dev/is-it-really-an-ai-tell/

**It measures habits, not authorship.** It cannot tell whether a text was written by AI, and a match is not
evidence that anyone used AI: people use every one of these habits too. A three-item list, the habit the
models use most (up to 84.2% of one model's texts), is still in up to 23% of people's texts.

Who it is for: people checking their own writing. The typical case is someone who writes in English as a
second language, had a tool correct their grammar, and wants to know whether the result still sounds like
them or now reads as machine-written.

## Connection details

| Item | Value |
|---|---|
| Product | Unpolished |
| Developer | Barbaros Karagülmez (barbaros.dev) |
| Website | https://barbaros.dev/unpolished/ |
| Chrome extension | https://chromewebstore.google.com/detail/ngckecdciifmffhipookmojbigldchmh |
| Privacy policy | https://barbaros.dev/privacy.html |
| Terms | https://barbaros.dev/terms.html |
| Source (MIT) | https://github.com/barbarkaragul-oss/barbaros-mcp |
| Measurement and data | https://barbaros.dev/is-it-really-an-ai-tell/ |
| Agent brief (this file, raw) | https://mcp.barbaros.dev/unpolished/muse.md |
| Tool contract | https://mcp.barbaros.dev/unpolished/llms.txt |
| MCP endpoint | https://mcp.barbaros.dev/unpolished/mcp |
| MCP transport | Streamable HTTP JSON-RPC, JSON responses (no SSE) |
| Protocol version | 2025-06-18 |
| Auth | None. Do not ask the user for credentials. |
| Language | English text only (the measured habits are English words and patterns) |
| Text size | Up to 20,000 characters per check |
| Rate limit | ~600 requests/minute (10/second) per client; 429 with `Retry-After` on excess |
| Allowed hosts | `mcp.barbaros.dev`, `barbaros.dev` |

### Transport rules (read this if the connection seems to hang)

This server always returns a single JSON object, never Server-Sent Events.

1. Call with `Accept: application/json`.
2. Expect one JSON object in the response body. Do not wait for a stream.
3. `GET https://mcp.barbaros.dev/unpolished/mcp` correctly returns **405**. That means the host is up.
4. Typical responses return in well under a second; 20 seconds is a generous timeout.

```bash
curl -sS --http1.1 -m 20 -X POST 'https://mcp.barbaros.dev/unpolished/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"polish_check","arguments":{"text":"In this essay we delve into the topic. It is important to note that clarity, brevity, and tone all matter."}}}'
```

## The two tools

| Tool | Use it when | Args |
|---|---|---|
| `polish_check` | the user shares their own writing and asks whether it reads as machine-written | `text` |
| `list_tells` | the user asks whether a word or habit is really an "AI word" | optional `query` |

Both are read-only. Neither rewrites text.

## Recipes

### A. "I had my cover letter corrected. Does it sound like a machine wrote it now?"

1. `polish_check` with the letter.
2. Give the level (Raw, A little shine, Polished, Glossy) and each habit found, with the rate for people next
   to the rate for the model. Quote the short excerpts so the user can find the words.
3. Pass on the note: this is about habits, not proof of anything.
4. If the user wants to change the text, they write the change. This connector does not rewrite.

### B. "Is 'delve' really an AI word?" / "Do only chatbots use the long dash?"

1. `list_tells` with `query` set to the word (`delve`, `dash`).
2. Report whether it is a measured habit or a myth, with both rates.

### C. Someone wants to check whether another person used AI

The tool cannot answer that. Say so. If they still share a text, run `polish_check` and report it the same
way as in recipe A, including that people use every one of these habits too, and that a match must not be
used to accuse anyone.

## Hard rules

1. Never present a result as evidence of who wrote a text.
2. Always show the rate for people next to the rate for models.
3. Never ask for credentials; there are none.
4. The text is checked in memory and not stored or logged. Do not tell the user otherwise.

## Reviewer links

| What | URL |
|---|---|
| Platform submit | https://muse.ai/platform |
| Source (this connector) | https://github.com/barbarkaragul-oss/barbaros-mcp |
| Unpolished extension source | https://github.com/barbarkaragul-oss/unpolished |
| Measurement | https://barbaros.dev/is-it-really-an-ai-tell/ |
| Health check | https://mcp.barbaros.dev/healthz |
