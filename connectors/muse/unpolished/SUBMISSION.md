# Muse Connector Platform — Unpolished submission pack

Submit at https://muse.ai/platform ("Submit a connector"), signed in with the same Meta account used for
PrivacyMatrix. **Do not submit until every check in [EVALS.md](./EVALS.md) passes against the live endpoint.**

Lessons from the PrivacyMatrix submission (2026-09-21):
- **Work email** must be the address of the Meta account you are signed in with. A different address
  (`info@barbaros.dev`) failed with a generic "Review the highlighted information" error.
- **"API or MCP documentation" takes exactly one URL.** Several URLs on separate lines fail silently with
  `invalid_request` in the browser console and no field highlighted.

---

## Step 1 — Overview

**Connector name**
```
Unpolished
```

**Company or developer**
```
Barbaros Karagülmez (barbaros.dev)
```

**Product website**
```
https://barbaros.dev/unpolished/
```

**Example prompts**
```
I had a grammar tool fix my email. Does it now read like a machine wrote it?
Check my cover letter for the words that language models overuse.
Is "delve" really an AI word?
Do only chatbots use the long dash?
Which parts of this paragraph sound polished, and how often do people write that way too?
```

**Connector icon**: [unpolished-icon.svg](./unpolished-icon.svg) (the extension's own icon, SVG with a square viewBox)

**Payments**: My connector does not accept payments

**Your name**: Barbaros Karagülmez · **Work email**: the address of the signed-in Meta account

**Support email or URL**
```
https://barbaros.dev/#contact
```

**Your privacy policy**
```
https://barbaros.dev/privacy.html
```

**Your terms of service**
```
https://barbaros.dev/terms.html
```

**Anything else? (optional)**
```
Brief (read this first): https://mcp.barbaros.dev/unpolished/muse.md
MCP (no auth): POST https://mcp.barbaros.dev/unpolished/mcp. Streamable HTTP, JSON responses, protocol 2025-06-18, 2 read-only tools.
Source (MIT): https://github.com/barbarkaragul-oss/barbaros-mcp

Unpolished is a Chrome extension that corrects English while keeping the writer's voice. This connector offers only its polish check: it tells a writer which habits in their text language models use far more often than people (for example "delve", "it is important to note"), with the measured rate for people next to the rate for the model that uses each most, and which popular "AI words" are myths (people use "moreover" and the long dash as much as models do). The rates come from a public measurement: https://barbaros.dev/is-it-really-an-ai-tell/

It uses no model and does not rewrite text. It measures habits, not authorship: every answer says that a match is not evidence that anyone used AI, because people use every one of these habits too.

The text sent for a check is scanned in memory and discarded. It is not stored, logged, shared or used for training. Same developer and server as the PrivacyMatrix connector, submitted 2026-09-21.
```

---

## Step 2 — Technical specs

**Connection type**: Existing MCP

**Hosted MCP endpoint**
```
https://mcp.barbaros.dev/unpolished/mcp
```

**API or MCP documentation** (one URL only)
```
https://mcp.barbaros.dev/unpolished/muse.md
```

**Access requirements**
```
Public. No account, API key or OAuth. Any Muse user, any region. English text, up to 20,000 characters per check. Read-only; the text is checked in memory and not stored. Fair-use rate limit of about 10 requests per second per client (429 with Retry-After on excess).
```

**Authentication methods**: leave `API keys`, `OAuth with PKCE` and `Other` unchecked.

---

## Step 3 — Review

Three checkboxes, including the [Muse Connector Terms](https://muse.ai/platform/terms). See
[security.md](./security.md) for how this connector meets them.

## After you click submit

Request id: _(fill in)_
Submitted on: _(fill in)_
