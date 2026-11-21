# Tickframe sample dashboard · v0.4

**Local Workspace v0.7:** `npm.cmd run build:local` writes `LocalWorkspace/dist` and adds **Sample History** to the same dashboard without replacing `dist`, `SampleHistory/dist` or `AuthLab/dist`. Use the [Windows run card](../Documentation/Installation/LocalWorkspaceWindows.md) to run it against the existing local sample database. This guide below still applies to the standalone dashboard.

The regular dashboard shows **simulated data only**. Overview account metrics, both positions views and position details, and Analytics’ Account snapshot read from the [sample API](../Backend/README.md#sample-snapshot-contract-v1). The chart, watchlist, trade history, per-instrument statistics and shadow decisions remain prewritten examples. The separate [Access Lab](../Documentation/UserGuide/AccessLab.md) does not authenticate the regular dashboard and is unchanged. The [Sample History preview](../Documentation/Testing/SampleHistoryChecks.md) builds independently with `npm run build:history` and does not replace the v0.4 dashboard.

## Try the sample feed in Arena

In **Tickframe sample dashboard v0.4 → Overview**, select **Delayed sample** under **Sample data feed → Delivery test**. The badge should change to **Stale** while sample amounts remain visible. Nothing is installed and nothing is sent to MT5. The test selection stays in the current tab; it does not affect anybody else's preview.

| State | What it means |
|---|---|
| **Fresh** | The read-only API recently delivered a usable sample. It does not mean the figures are live. |
| **Stale** | The example was delivered late, has aged past its delivery window, or is the last valid sample after a failed check. Numbers may remain visible, labelled stale. |
| **Unavailable** | There is no verified sample for the current delivery test. The account cards show dashes and the positions section does not show a count. This is different from a valid sample with zero open positions. |

**Normal delivery** returns to the regular read. **Simulated outage** demonstrates Unavailable without taking the Web API status endpoint down. **Check now** retries the selected case. **Example as of** names the fixed fictional moment; **Sample published** is the separate delivery timestamp. **Web API: Online** confirms only the status endpoint answered. **MT5 not connected** and **Live entries: Locked** are unchanged.

Other preview actions work as before: choose an instrument and intensity in **Trading controls**; explore 1D/7D/30D on the illustrative chart; open a sample position to inspect its values; or filter **Trade history** and download **Sample CSV** (`SIMULATED_FIXTURE`). The emergency switch is a browser-only latch, not an MT5 command. **Settings → Reset preview** clears local preview preferences. A new preview URL starts with that origin’s browser preferences; it does not copy the old preview's settings.

## Run on Windows (optional)

The online preview is enough to review this milestone. For working sample numbers, first extract the source archive and follow the [combined FastAPI + UI guide](../Backend/README.md#run-the-combined-preview-on-windows-optional). The steps below run the UI by itself for design work; the API badges and sample numbers are unavailable in this mode. Neither mode needs MT5 or a broker account.

1. Save the **UltraShortTermTradingSystem-WebSample-0.4.zip** in **Downloads**. In File Explorer right-click the ZIP → **Extract All…**. Extract to a folder you can find, for example `Downloads\Tickframe-WebSample`. The project is under `UltraShortTermTradingSystem\Frontend`. Do not overwrite an existing working copy; this is a separate snapshot. Keep the portable Git bundle if you want to retain the history; the method in the [Windows project guide](../Documentation/Installation/WindowsSetup.md#git-and-the-starter-package--after-the-demo-check) applies using `UltraShortTermTradingSystem-web-sample.bundle` instead of the Stage 1 bundle and a new destination folder.
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

4. In your browser, open the **Local** address printed by Vite, normally `http://localhost:5173/`. Success means the **Tickframe Overview** renders with **Simulation preview** visible. The Web API and the sample feed will be unavailable in this UI-only mode; the prewritten charts and history will still work. Keep the PowerShell window open while using the site; press **Ctrl+C** in it to stop.

| If this happens | What to do |
|---|---|
| `node` or `npm.cmd` not recognized | Reopen PowerShell after installing Node; confirm it was added to PATH. |
| PowerShell script policy blocks `npm` | Use `npm.cmd` as shown. There is no need to disable security settings. |
| `Could not read package.json` | Check the prompt ends in `Frontend`; `Get-ChildItem package.json` should find it. |
| The browser can't reach the site | Make sure the terminal is still running. Use the exact **Local** address it prints if 5173 was already taken. |

## Review and verification

- Entry: `index.html`, `src/main.jsx`, `src/App.jsx`. Components and views live in `src/components/` and `src/pages/`; `src/services/preview-model.js` holds prewritten chart/market examples and local preference validation. The account and positions client is `src/services/sample-api.js`; polling lives in `src/hooks/useSampleFeed.js`. `src/styles.css` and bundled fonts control the responsive layout; font licenses are checked in with the assets.
- `npm.cmd run build` creates a static bundle in `dist/`. `npm.cmd test` runs the settings, status and sample-feed tests.
- For interactive tests, run the **combined preview** on port 5173 using the Backend guide, and open another terminal in `Frontend`. Run `npx.cmd playwright install chromium`, then `npm.cmd run test:browser`. Set `$env:PREVIEW_BASE_URL` if using another port. In Linux CI, Playwright may also need its browser system libraries.
- In Arena the combined preview is served by FastAPI. The Vite `*.e2b.app` allowlist is only for fixture-only frontend development in Arena. The default Windows dev command listens locally. Neither mode is a production deployment or an authentication boundary.

The independent status client remains in `src/services/status-api.js` and `src/hooks/usePreviewStatus.js`. See the [v0.4 QA handoff](../Documentation/Testing/WebSampleChecks.md). Production identity, durable storage, access review and the native EA bridge remain separate work; this preview does not implement them or enable trading.
