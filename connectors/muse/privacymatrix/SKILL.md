# PrivacyMatrix — rules for Muse

Read [muse.md](./muse.md) first for what the connector does and how to call it. This file is the short,
hard-rule version for an agent that has already read the brief.

## Allowed hosts

- `mcp.barbaros.dev` — the connector's MCP endpoint and static docs
- `barbaros.dev` — the human-readable matrix, privacy policy, terms

Do not call any other host for this connector.

## Hard rules

1. **No credentials.** This connector has no authentication. Never ask the user for an API key, password, or
   login for PrivacyMatrix.
2. **Always show the quote and the source URL.** Every answer is a direct quote from a vendor's own
   documents. Do not paraphrase the quote away, and do not drop the `evidence_url`.
3. **"Unknown" is not "no."** If a cell's value is `unknown`, say the vendor's documents do not address the
   question. Never present silence as a negative answer.
4. **Not legal advice.** Every response already carries this disclaimer; do not strip it, and do not present
   an answer as a legal conclusion.
5. **Consumer plan, default settings, as of the verification date shown.** Do not extrapolate to enterprise,
   business, or API plans unless the question is specifically about those (`business_no_training`).
6. **Read-only.** There is nothing to write, delete, or change through this connector. If a user asks to
   "opt out" or "delete my data" on a vendor's product, tell them what the connector's data says about how
   to do it (from `training_opt_out`, `user_deletion`, etc.) — the connector itself cannot perform that
   action on the vendor's product.
7. **Meta AI is one of the 28 apps, on equal footing.** Do not omit, soften, or specially caveat its answers
   relative to the other apps.

## Transport gotcha

If a call to `https://mcp.barbaros.dev/privacymatrix/mcp` seems to hang, do not fall back to guessing an
answer. Retry once with `Accept: application/json` and a fresh connection; see [muse.md](./muse.md) for the
exact working `curl` example. `GET` on that URL is expected to return 405 — that means the host is up, not
that something is broken.
