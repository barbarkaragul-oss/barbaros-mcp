# Muse Connector Platform — PrivacyMatrix submission pack

Submit at https://muse.ai/platform (button: "Submit a connector"). Sign in first with your Meta work email —
the form gates on that before showing the steps.

**Do not submit until the endpoint is live and the checks in [EVALS.md](./EVALS.md) pass.** Meta's review
includes end-to-end testing; a submission against a dead endpoint wastes a review cycle and may need to be
resubmitted.

**Status: SUBMITTED (2026-09-21).** Confirmation screen: "Thank you for your submission! We'll review
PrivacyMatrix and get in touch." First attempt failed twice with a generic `invalid_request` error (no field
highlighted); the cause was the "API or MCP documentation" field rejecting multiple URLs — see the note below
that field. A separate `muse.ai/access` "waitlist" message about the Muse consumer app not yet being
available in the developer's country is unrelated to this submission; the connector directory and its review
process are not gated by the submitter's own regional access to Muse.

Awaiting Meta's review. No request id was shown on the confirmation screen.

---

## Step 1 — Overview

**Connector name**
```
PrivacyMatrix
```

**Company or developer**
```
Barbaros Karagülmez (barbaros.dev)
```

**Product website**
```
https://barbaros.dev/privacymatrix/
```

**Example prompts**
```
Does ChatGPT train on my conversations by default, and how do I opt out?
Which AI chat apps let me delete a conversation for good, and how long until it is really gone?
Compare Claude, Gemini and ChatGPT on training, memory controls and data export.
Which assistants have a real incognito or temporary chat mode?
Show me the exact sentence in Perplexity's privacy policy about selling my data.
```

**Connector icon**: [privacymatrix-icon.svg](./privacymatrix-icon.svg) (SVG, 512×512 viewBox, ~1.4 KB)

**Payments**: My connector does not accept payments

**Your name**: (your name) · **Work email**: (the address you signed in with)

**Support email or URL**
```
https://barbaros.dev/#contact
```

**Your privacy policy**
```
https://barbaros.dev/privacy.html
```
*(must already show the "Connectors and APIs" section — see repo root plan §Adım G — before you submit)*

**Your terms of service**
```
https://barbaros.dev/terms.html
```
*(must already show the "Connector and API use" section before you submit)*

**Anything else? (optional)**
```
Public connector brief (read this first): https://mcp.barbaros.dev/privacymatrix/muse.md
MCP (no auth): POST https://mcp.barbaros.dev/privacymatrix/mcp — Streamable HTTP, JSON responses, protocol 2025-06-18, 7 read-only tools.
Tool contract: https://mcp.barbaros.dev/privacymatrix/llms.txt
Source (MIT): https://github.com/barbarkaragul-oss/barbaros-mcp
Dataset (MIT): https://github.com/barbarkaragul-oss/privacymatrix

Data: 28 consumer AI assistants x 14 privacy questions. Every answer is a sentence quoted from the vendor's
own privacy policy or help center, with the source URL and the date it was last verified there (re-verified
weekly by CI; a missing quote demotes the cell to "unknown" rather than leaving a stale answer). Meta AI is
one of the 28 apps and is treated exactly like the others, including where its answer is "no".

The connector receives only the tool arguments (an app name, a question, or a search string) that the
user's own request implies. No account, no personal data, no chat content is collected, and nothing is
written or stored beyond an in-memory snapshot of the public dataset. Not legal advice; every answer shows
the quote and the source.
```

---

## Step 2 — Technical specs

**Connection type**: Existing MCP

**Hosted MCP endpoint**
```
https://mcp.barbaros.dev/privacymatrix/mcp
```

**API or MCP documentation**
```
https://mcp.barbaros.dev/privacymatrix/muse.md
```
**Known issue: this field rejects multiple newline-separated URLs with a silent, unhelpful
`invalid_request` client-side error** (no field is visibly highlighted; the real error only shows in the
browser console, not in the UI). Put exactly one URL here — the brief above already links to `llms.txt` and
the GitHub source, so nothing is lost. Confirmed working 2026-09-21.

**Access requirements**
```
Public. No account, API key or OAuth. Any Muse user, any region. Read-only. Fair-use rate limit
(about 60 requests per minute per client; 429 with Retry-After on excess). Coverage: 28 consumer
AI assistant apps, 14 privacy questions, consumer plan with default settings, as published in the
vendors' own documents.
```

_Note (2026-09-26): the rate limit in the text above is what was submitted. It was raised afterwards to about 10 requests/second per client, because Muse calls from a few shared Meta egress addresses; the live brief says so. Being more lenient than declared does not change anything for reviewers._

**Authentication methods**: leave `API keys`, `OAuth with PKCE`, and `Other` all unchecked. There is no
authentication for any tool.

---

## Step 3 — Review

Three checkboxes: authorization to submit, no-guarantee acknowledgement, and agreement to the
[Muse Connector Terms](https://muse.ai/platform/terms). See [security.md](./security.md) for how this
connector meets the Terms' data-handling, accuracy, and disclosure obligations before you check that box.

---

## After you click submit

Note the confirmation screen / request id here, and keep [muse.md](./muse.md) and
[llms.txt](https://mcp.barbaros.dev/privacymatrix/llms.txt) stable on `main` so Meta's e2e tester hits the
same URLs used in this submission.

Request id: _(fill in after submitting)_
Submitted on: _(fill in)_
