# Unpolished connector for Meta Muse

Listing pack for the [Muse Connector Platform](https://muse.ai/platform). The connector is the polish check
from the [Unpolished](https://barbaros.dev/unpolished/) Chrome extension, served from the same
`barbaros-mcp` server as PrivacyMatrix at `https://mcp.barbaros.dev/unpolished/mcp`.

| File | For |
|---|---|
| [muse.md](./muse.md) | Muse itself; also served live at `/unpolished/muse.md` |
| [SKILL.md](./SKILL.md) | Allowed hosts and hard rules |
| [INSTALL.md](./INSTALL.md) | Paste-into-Muse prompt, works before approval |
| [SUBMISSION.md](./SUBMISSION.md) | Text for Meta's form, with lessons from the first submission |
| [security.md](./security.md) | Security, data and Terms notes for reviewers |
| [EVALS.md](./EVALS.md) | Checks anyone can run |
| [unpolished-icon.svg](./unpolished-icon.svg) | Connector icon |

The scan code and the measured rates are vendored from the extension; see
`src/connectors/unpolished/vendor/UPSTREAM`.
