# Unpolished × Muse — security and data note

For Meta functional / security / legal review.

## Trust boundary

```
User → Muse VM → https://mcp.barbaros.dev/unpolished/mcp → pattern counts in memory → answer
```

No model is called, no third party is contacted, and nothing is written anywhere.

## Auth

None. There is nothing to put in Muse's credential store, and the connector never asks for a login or key.

## Data the connector sees (Muse Connector Terms §4.3)

- `polish_check` receives the text the user asks it to check. That text may contain personal information,
  because it is the user's own writing. It is used only to count writing habits for that request (§4.3(a)).
- The answer sends back, to the same caller, the counts and up to three short excerpts of the user's own text
  around each match, so the user can see which words were found.
- Retention (§4.3(f)): none. The text is not stored, cached, logged or shared, and is discarded when the
  response is sent. The server has no database.
- `list_tells` receives at most a word to look up.

## Logging

The application logs timestamp, method, path, status code and response time. Request bodies, and so the
submitted text, are never logged, by the application or by nginx. nginx access logs (IP address, path, status)
are kept 14 days; application logs (time, path, status, duration; no IP address, no content) up to 30 days.
Both are used only for security and reliability.

## Privacy notice (§4.3(c))

https://barbaros.dev/privacy.html, section "Connectors and APIs", states what a polish check receives and
that it is not stored.

## Scope

Exactly two read-only tools, `polish_check` and `list_tells`, documented in [muse.md](./muse.md) and
https://mcp.barbaros.dev/unpolished/llms.txt. Neither rewrites text. Other paths: the static docs
(`/unpolished/`, `/unpolished/muse.md`, `/unpolished/llms.txt`) and `/healthz`.

## Accuracy and misuse

The rates are measured, with the data and method public. The tool reports writing habits, never authorship,
and every response says that a match is not evidence that anyone used AI. The server instructions tell Muse
to pass that on and to show the rate for people next to the rate for models, so a result is not used to
accuse anyone. It offers no way to change a text.

## Abuse

Text is limited to 20,000 characters and request bodies to 64 KB (413 above). A per-client rate limit of about
10 requests per second applies in the application and in nginx, with 429 and `Retry-After`.

## Security contact

https://barbaros.dev/#contact, or the email of the Muse developer account. Incidents involving user data
would be reported to Meta within 48 hours (§4.3(b)).
