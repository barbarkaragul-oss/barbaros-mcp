# Install PrivacyMatrix on Muse (custom connector, works before directory approval)

Paste the block below into a Muse chat. There is no API key and nothing to approve beyond the fetch itself.

```
Build a custom connector for PrivacyMatrix so you can answer privacy questions about AI assistant apps
(does it train on my chats, can I delete my data, is there an incognito mode, who can read my conversations).

Read the connector brief first:
https://mcp.barbaros.dev/privacymatrix/muse.md

Also useful:
- MCP server: https://mcp.barbaros.dev/privacymatrix/mcp (Streamable HTTP, JSON responses, no auth, protocol 2025-06-18)
- Tool contract: https://mcp.barbaros.dev/privacymatrix/llms.txt
- Human-readable matrix: https://barbaros.dev/privacymatrix/

Rules:
- No API key. Do not ask me for credentials.
- Allowed hosts only: mcp.barbaros.dev, barbaros.dev
- Every answer must include the quote and the source URL from the tool result. Do not summarize those away.
- If a value is "unknown", say the vendor's documents do not address it. Never say "no" for an unknown cell.
- This is not legal advice — say so when you give an answer.
- Read-only: there is nothing to write, delete, or purchase through this connector.

When the connector works, tell me whether ChatGPT trains on my conversations by default, quote the sentence,
and give me the source URL.
```

## After Meta approves the directory listing

Users will connect from Muse Settings → Connectors → PrivacyMatrix. The same brief applies; still no
authentication for any tool.
