# Tickframe web preview · v0.1

A standalone, responsive React + Vite interface with **synthetic fixtures only**. Use the Arena live preview first; nothing needs installing to view it there. There is no Exness connection, FastAPI service, database, implemented authentication, broker control or strategy engine in this build. Local controls change only the browser's preview preferences. Do not add credentials or use this as a production console.

## First things to try

1. Open **Trading controls**. Switch **Active instrument** from `EURUSD` to `GBPUSD`, drag the intensity slider and click **Apply preview settings**. The Trading status and Market watch should update; sample positions should stay unchanged.
2. Click **1D**, **7D** or **30D** above the equity chart. Hover over it or focus it and use the arrow keys for example values.
3. Choose a position row's symbol for its stop, volume, strategy and explanation. In **Trade history**, filter by instrument and try **Sample CSV**; the export identifies every row as `SIMULATED_FIXTURE`.
4. Use the shield in the header to test the preview-only stop. The status latches to **Emergency stop** and is retained on reload. The same button can clear it after you confirm. It cannot act on any account. Use **Settings → Reset preview** to restore the default example preferences.

## Run on Windows (optional)

The online preview is enough to review this milestone. These steps are for running your own source copy. You do not need MT5, Python, or a broker account for these steps.

1. Save the **WebPreview** source ZIP in **Downloads**. In File Explorer right-click the ZIP → **Extract All…**. Extract to a folder you can find, for example `Downloads\Tickframe-WebPreview`. The project is under `UltraShortTermTradingSystem\Frontend`. Do not overwrite an existing working copy; this is a separate snapshot. Keep the portable Git bundle if you want to retain the history; the method in the [Windows project guide](../Documentation/Installation/WindowsSetup.md#git-and-the-starter-package--after-the-demo-check) applies using `UltraShortTermTradingSystem-web-preview.bundle` instead of the Stage 1 bundle and a new destination folder.
2. At [nodejs.org](https://nodejs.org/en/download) select a current **LTS** version (22.12+), Windows **Installer (.msi)** and your architecture, normally **x64**. Node runs the development tools; npm installs the pinned project packages. Open the installer → **Next** → accept the license → keep default features, including npm and adding to PATH → **Install → Finish**. No extra native-build tools are required. Open a **new** PowerShell from Start and verify:

   ```powershell
   node --version
   npm.cmd --version
   ```

3. In File Explorer open the extracted project's `Frontend` folder. Right-click a blank part of the folder and choose **Open in Terminal**. If that option is missing, type `cd ` in PowerShell followed by the quoted full path to `Frontend`, then press Enter. Run these lines one by one:

   ```powershell
   npm.cmd ci
   npm.cmd run dev
   ```

4. In your browser, open the **Local** address printed by Vite, normally `http://localhost:5173/`. Success means the **Tickframe Overview** renders with **Simulation preview** visible. Keep the PowerShell window open while using the site; press **Ctrl+C** in it to stop.

| If this happens | What to do |
|---|---|
| `node` or `npm.cmd` not recognized | Reopen PowerShell after installing Node; confirm it was added to PATH. |
| PowerShell script policy blocks `npm` | Use `npm.cmd` as shown. There is no need to disable security settings. |
| `Could not read package.json` | Check the prompt ends in `Frontend`; `Get-ChildItem package.json` should find it. |
| The browser can't reach the site | Make sure the terminal is still running. Use the exact **Local** address it prints if 5173 was already taken. |

## Review and verification

- Entry: `index.html`, `src/main.jsx`, `src/App.jsx`. Components and views live in `src/components/` and `src/pages/`; `src/services/preview-model.js` contains the labeled sample data and local validation. `src/styles.css` and bundled fonts control the responsive layout; font licenses are checked in with the assets.
- `npm.cmd run build` creates a static bundle in `dist/`. `npm.cmd test` runs the fixture/setting tests.
- For interactive tests, keep the preview running on port 5173 and open another terminal in `Frontend`. Run `npx.cmd playwright install chromium`, then `npm.cmd run test:browser`. Set `$env:PREVIEW_BASE_URL` if using another port. In Linux CI, Playwright may also need its browser system libraries.
- The Vite `*.e2b.app` allowlist is for Arena's hosted fixture preview only. The default Windows dev command listens locally. Neither server mode is a production deployment or an authentication boundary.

Next web milestone: a versioned, read-only FastAPI status/data contract and explicit unconnected/stale/error states backed by tested responses. Add secure login and two-factor, the native EA bridge, and verified control acknowledgements before allowing any real control path. Production controls and risk limits must be independently validated by the EA, not trusted from this form.
