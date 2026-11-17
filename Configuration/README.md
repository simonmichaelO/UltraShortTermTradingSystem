# Configuration boundary

Stage 1 has no runtime config or secrets. [The architecture](../Documentation/Architecture/SystemDesign.md) records the requirements baseline. Later, track schema and reviewed examples only. Keep machine-specific files in the ignored `Configuration/Local/` directory; use Windows credential storage or user-restricted secret files outside the Git tree for backend secrets. Provision any EA bridge secret separately in its restricted terminal data folder, not in source, command-line arguments, or an exported MT5 preset.

Never commit broker logins, passwords, MT5 data folders, Telegram tokens, authenticator seeds, recovery codes or personal data. A private repository is not a secret store. `.gitignore` is a guardrail, not a substitute for checking staged files.
