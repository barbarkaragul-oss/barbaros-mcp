# PrivacyMatrix connector for Meta Muse

Official listing pack for the [Muse Connector Platform](https://muse.ai/platform).

Muse is Meta's personal agent. This folder is the PrivacyMatrix connector: what it does, which hosts it may
call, how to test it, and the text to paste into Meta's submit form.

The live dataset sits on the existing public [PrivacyMatrix](https://github.com/barbarkaragul-oss/privacymatrix)
repository (28 apps × 14 privacy questions, quote-sourced, re-verified weekly). This connector is a thin,
read-only MCP server in front of that data — no new dataset, no API key to issue, no user data collected.

## Files

| File | Who it is for |
|---|---|
| [muse.md](./muse.md) | Muse itself. Fetch this URL and build the connector from it. |
| [SKILL.md](./SKILL.md) | Allowed hosts and hard rules. |
| [INSTALL.md](./INSTALL.md) | Paste-into-Muse prompt. Works today as a custom connector, before directory approval. |
| [SUBMISSION.md](./SUBMISSION.md) | Paste-into-Meta form. Reviewers and the developer. |
| [security.md](./security.md) | Functional / security / legal review notes, incl. Muse Connector Terms obligations. |
| [EVALS.md](./EVALS.md) | Commands Meta (and we) can run to verify the connector. |
| [privacymatrix-icon.svg](./privacymatrix-icon.svg) | 512×512 connector icon (SVG, ~1.4 KB). |

Stable brief URL (served live by the connector itself):

https://mcp.barbaros.dev/privacymatrix/muse.md

## Why this shape

Meta opened the directory on 18 September 2026 with a three-step form and a work-email login. There is no
published SDK. The working pattern (confirmed against a live third-party submission the same week) is: publish
a brief, point Muse at a public HTTPS/MCP server, declare allowed hosts, keep secrets out of the repo, and
respond to POST-only Streamable HTTP with a single JSON body — Muse's egress proxy has been reported to hang
on Server-Sent Events.

PrivacyMatrix already has a natural shape for this: static, quote-sourced, weekly-verified data with no
authentication and no user data in scope.

## Submit today

1. Build and deploy this connector (`../../` is the server source; see the repo root README).
2. Open https://muse.ai/platform
3. Sign in with a Meta work email.
4. Paste [SUBMISSION.md](./SUBMISSION.md).
5. Point reviewers at this folder.

Until the directory lists it, anyone can still connect PrivacyMatrix by pasting [INSTALL.md](./INSTALL.md)
into Muse as a custom connector.
