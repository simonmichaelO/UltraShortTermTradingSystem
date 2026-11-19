# Tickframe read-only preview API

This guide covers the regular v0.2 dashboard. For passwords and authenticator codes with disposable test identities, use the [separate Access Lab](AuthLab.md).

A small FastAPI service provides **web availability** and **data provenance**, not a broker connection. In this milestone it serves the compiled React UI and `GET /api/v1/status` from the same origin. There is no SQLite database, MT5 bridge, trading operation, user login, or use of broker credentials.

## Contract v1

`GET /api/v1/status` returns `application/json`, HTTP 200 and `Cache-Control: no-store`:

```json
{
  "schema_version": 1,
  "service": "tickframe",
  "environment": "preview",
  "mt5_connection": "not_configured",
  "data_source": "simulated_examples",
  "real_controls_available": false,
  "generated_at": "2026-11-17T14:30:32Z"
}
```

`generated_at` is the server's UTC response time (an example is shown), **not** the age of a price quote or a terminal heartbeat. The API never returns prices, positions or operator preferences; the UI has its own visibly labelled fixtures. Other methods such as POST are rejected, and there are no configuration or order routes. Interactive API documentation is disabled in the hosted preview; `app/api/status.py` is the typed schema.

## Run the combined preview on Windows (optional)

Use the [Arena preview or front-end setup guide](../Frontend/README.md) first. There is nothing to install to use the hosted preview. Only follow these steps if running a local copy:

1. Extract the source ZIP. In File Explorer, open the project’s `Frontend` folder and choose **Open in Terminal**. Install Node.js as described in the front-end guide. In the terminal, run:

   ```powershell
   npm.cmd ci
   npm.cmd run build
   ```

   A successful build creates `Frontend\dist\index.html` and an assets folder. Do **not** also start the Vite dev server on port 5173 for this combined mode.
2. Install a supported **Python 3.13** release from the [official Windows downloads](https://www.python.org/downloads/windows/). Use the official Python Install Manager and `py install 3.13` if 3.13 is not already installed. Open a new PowerShell and check `py -3.13 --version`. If `py` is missing after install, reopen the terminal or follow the install manager instructions to enable the launcher.
3. Open a terminal inside the project's `Backend` folder. Create an isolated Python environment and run the service using that environment:

   ```powershell
   py -3.13 -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 5173
   ```

4. Open `http://127.0.0.1:5173/` in your browser. Under **Trading status**, look for **Web API: Online**, **MT5 not connected**, and **Live entries: Locked**. If `/` says Not Found, confirm Step 1 built `Frontend\dist` and restart Uvicorn. If the port is in use, stop the old local preview or use `--port 5174` and browse to that port. Press **Ctrl+C** in the terminal to stop the service.

The Windows commands are written for a local-only setup; don't forward or expose this service to a network. The public Arena sandbox serves fixtures and the safe status response only. A later production service must use authentication and two-factor, tested access controls and a separately reviewed native bridge before enabling any real data or control feature.

## Reproduce tests

From `Backend`, run these lines in PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-test.txt
.\.venv\Scripts\python.exe -m pytest -q
```

Tests invoke the ASGI app in-process and do not require broker or browser access. See [Web status verification](../Documentation/Testing/WebStatusChecks.md) for the integrated checks.
