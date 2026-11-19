# Run the isolated Access Lab · v0.3.2

The lab is a separate FastAPI application and React build. It creates disposable test identities and has only one permission: read a synthetic status card and that test identity’s recent sign-in events. No existing Tickframe account is created or modified. The regular [v0.2 preview](README.md) stays unauthenticated and fixture-only; it never mounts the lab router. See the [click-through guide](../Documentation/UserGuide/AccessLab.md) for the hosted version. **Do not start a local copy just to use the Arena preview.**

## Optional local Windows setup

Install Node.js and Python 3.13 if needed using the [official download links and instructions](README.md#run-the-combined-preview-on-windows-optional). Extract the project source ZIP. These steps use the terminal to build the lab UI and run its server on your PC. They do not require MT5, a trading account or a Python package installed system-wide.

1. In File Explorer, open the project’s `Frontend` folder. Right-click empty space, choose **Open in Terminal**, then run:

   ```powershell
   npm.cmd ci
   npm.cmd run build:auth
   ```

   Success: `Frontend\AuthLab\dist\index.html` exists. The command doesn’t replace `Frontend\dist` or require a Vite server. If `npm.cmd` is missing, install a supported Node release and open a new terminal.
2. Open a terminal in the project's `Backend` folder. If `.venv` already exists from the v0.2 guide, skip the first line:

   ```powershell
   py -3.13 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements-auth.txt
   $env:TICKFRAME_LAB_MODE = "loopback"
   .\.venv\Scripts\python.exe -m uvicorn app.auth_lab:from_environment --factory --host 127.0.0.1 --port 5175 --no-access-log --no-proxy-headers
   ```

   Success: the terminal says Uvicorn is running at `http://127.0.0.1:5175`. If `py` is missing, check that Python 3.13 and its launcher are installed, then reopen PowerShell. If port 5175 is already in use, stop that lab instance before trying again. Do not add `--reload` or `--workers`; a restart drops all test accounts and multiple workers cannot share this test state.
3. Open `http://127.0.0.1:5175/` and click **Open sign-in lab**. It should offer **Create test account**. If it says that the UI must be built, repeat Step 1 in `Frontend`, then restart Step 2. Use **Ctrl+C** in the lab terminal to stop it. Do not expose this loopback setup to a network or add real data to it.

## API and security boundaries

| Route | Requirement and result |
|---|---|
| `POST /api/v1/auth/enroll` | Same-origin, bounded. Generates a random test username, password, temporary setup cookie and one-time TOTP setup material. Returns them only in this response; no-store. |
| `GET /api/v1/auth/setup` | Confirms the setup cookie was kept. Does not return setup credentials or give a login. |
| `POST /api/v1/auth/pair` | Own unexpired setup cookie + valid TOTP. Activates the test identity; does **not** log in. |
| `POST /api/v1/auth/password` | Correct test username and Argon2id password verification. Issues only a three-minute challenge cookie. |
| `POST /api/v1/auth/totp` | Own challenge + fresh time-based code. Consumes the challenge and rotates to a session cookie. |
| `GET /api/v1/auth/session` | Fully verified server session with test-only role. Non-renewing check. |
| `GET /api/v1/lab/workspace` | Fully verified session and test-only role. Returns disconnected/locked status and this identity’s bounded activity; counts as an authenticated visit for idle timeout. |
| `POST /api/v1/auth/logout` | Revokes the current session and clears that browser’s setup/challenge/session cookies. |

- **Ephemeral by design.** Enrollment (20 minutes), password challenge (3 minutes), and account lifetime (4 hours once paired) are time-bounded. Sessions have a 45-minute maximum and expire after 15 minutes without an authenticated workspace read. Any service restart clears the entire test state. No database or production credential store; decrypted TOTP keys exist only in the process and one-time browser enrollment. They are not persisted across restarts. No recovery codes, password reset or role provisioner in this lab.
- **Verification.** `argon2-cffi` uses Argon2id with random salt, 32 MiB, 3 iterations and one lane. Passwords are generated from 18 random bytes. `pyotp` computes time-based six-digit codes in 30-second steps; one step of clock drift is accepted, but an accepted step cannot be reused for the same identity. `segno` generates the QR locally in memory. There is no authenticator vendor API. Password work is bounded to two concurrent hashes; the lab caps active/pending identities, global and per-identity attempts, and per-account history. Expiration uses a monotonic clock; real UTC is used for TOTP.
- **Sessions and browser origin.** Cookies carry opaque random tokens with only digests in server state. Secrets are not put in URLs, browser storage or logs. Local mode requires a loopback peer and `Host`, sends HttpOnly/SameSite=Strict cookies, and denies framing on `/lab`. Arena mode uses HTTPS from the Arena preview proxy, `Secure`/`HttpOnly` host-only `__Host-` cookies and `SameSite=None; Partitioned` so the preview can work in a supported embedded browser. The form page permits only its own origin and Arena’s `arena.ai`/`lmarena.ai` origins as frame ancestors. State-changing requests require an exact same-origin `Origin`, same-origin Fetch Metadata if present, JSON under 4 KiB, and no CORS. The service does not trust forwarded identity headers. Neither mode exposes a broker action.
- **Not a deployment claim.** This lab has no durable, encrypted credential storage, operational roles, protected broker configuration, backup/recovery or action/re-authorisation policy. Satisfying those, testing a real TLS deployment and reviewing the design independently are separate gates. Do not repurpose Arena’s framed test profile for production.

## Tab-only sessions (Arena test lab only)

Some preview/browser combinations do not return the setup cookie. Starting with v0.3.2, the hosted server puts its lab profile into the HTML, so the hosted form uses **Create test account without cookies** and **I have test credentials** with the `/api/v1/auth/tab/` routes by default. There is no hostname heuristic, cookie probe or alternate creation button in that UI. Those routes are mounted **only** in `arena` mode and do not send or issue cookies. The loopback UI retains the standard HttpOnly-cookie flow. Rebuild the UI before starting a patched backend; an old build without the profile marker is rejected rather than guessing a mode.

- Enrollment, password challenge and verified session each get a different opaque handle. The server scopes their digests to this transport and validates the correct stage, expiry, both factors, role and original attempt limits. A setup or challenge handle cannot read the workspace; a tab handle cannot act as a cookie and vice versa.
- The client sends handles only in same-origin JSON POST bodies (never URLs, browser storage or logs). The active handle stays in the current document’s JavaScript memory; a refresh, close or restored history page cannot resume that flow. Explicit sign-out revokes it on the server; abandoning a page does not extend its normal expiry. Keep the preview open during the walkthrough.
- This is an isolated test convenience, not production session design. A script running in the lab origin could use the current document’s proof; the tab transport is not equivalent to HttpOnly. The lab retains the restricted CSP, origin guard and sample-only role. The loopback lab and regular dashboard have no tab auth route. Never use this transport with live data, real credentials or broker controls.

## Tests

From `Backend` on Windows, with the environment from Step 2:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-auth-test.txt
.\.venv\Scripts\python.exe -m pytest -q
```

For a browser test, leave the loopback lab running. In a second terminal under `Frontend`:

```powershell
npx.cmd playwright install chromium
npm.cmd run test:auth-browser
```

The loopback run skips the explicitly separate TLS/iframe and tab-only cases. The tests create disposable accounts at runtime, not fixed test credentials. Browser screenshots, video and traces are off. If repeating test runs rapidly, wait a minute or restart the **local test** server to clear the global time window. See the [test report](../Documentation/Testing/AuthLabChecks.md) for the observed results, separate TLS replay and what remains untested.
