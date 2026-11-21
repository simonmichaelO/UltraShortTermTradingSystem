# Run Tickframe Local Workspace v0.7 on Windows

Use your existing **`$HOME\Tickframe`** working copy. This update does not touch the SQLite file from the v0.6 Windows test, or replace the standalone v0.6 build. **Do not clone into a new folder, overwrite the working copy with the ZIP, or run `seed`.** No MT5 or cloud account is needed.

## 1. Update the existing source clone

Download **`UltraShortTermTradingSystem-web-local-workspace.bundle`** to **Downloads** on the Windows PC. It is also inside **`UltraShortTermTradingSystem-WebLocalWorkspace-0.7.zip`**. If using the ZIP, extract it separately and use the full path to the `.bundle` **file**, not its folder.

Open **Windows PowerShell** from Start. If the bundle is somewhere else, edit the first line to its exact path. Paste this block together:

```powershell
& {
    $bundle = Join-Path $HOME 'Downloads\UltraShortTermTradingSystem-web-local-workspace.bundle'
    if (-not (Test-Path -LiteralPath $bundle -PathType Leaf)) { throw "Bundle file not found: $bundle" }
    Set-Location -LiteralPath "$HOME\Tickframe" -ErrorAction Stop
    if ((git branch --show-current) -ne 'main' -or (git status --porcelain)) {
        throw 'Expected a clean main in the existing Tickframe clone. Do not reset or overwrite files.'
    }
    git bundle verify "$bundle"
    if ($LASTEXITCODE -ne 0) { throw 'The bundle did not verify.' }
    git fetch --no-tags "$bundle" refs/heads/main refs/tags/web-local-workspace-v0.7:refs/tags/web-local-workspace-v0.7
    if ($LASTEXITCODE -ne 0) { throw 'Bundle fetch failed. Stop here.' }
    git merge --ff-only FETCH_HEAD
    if ($LASTEXITCODE -ne 0) { throw 'A fast-forward was not possible. Stop; do not force the merge.' }
    git describe --tags --exact-match HEAD
}
```

The last line should print **`web-local-workspace-v0.7`**. If not, stop and check the version. This fetch does not change `origin` or push anything. The existing `LocalData` stays ignored and separate from Git.

## 2. Build and start on this PC only

In the same PowerShell window, paste this block:

```powershell
& {
    Set-Location -LiteralPath "$HOME\Tickframe\Frontend" -ErrorAction Stop
    npm.cmd run build:local
    if ($LASTEXITCODE -ne 0) { throw 'Build did not finish. Stop here.' }

    Set-Location -LiteralPath "$HOME\Tickframe\Backend" -ErrorAction Stop
    $env:TICKFRAME_HISTORY_DB = (Resolve-Path -LiteralPath '..\LocalData\SampleHistoryPreview\history.sqlite3' -ErrorAction Stop).Path
    .\.venv\Scripts\python.exe -m uvicorn app.local_workspace:from_environment --factory --host 127.0.0.1 --port 5182 --no-proxy-headers
}
```

The installed Node packages and Python environment from v0.6 are sufficient. Only if the build tool is missing, run `npm.cmd ci` in `Frontend`, then retry the build. If the database path is missing, locate the previously saved synthetic SQLite file and use its exact path; **do not seed again** for this test. If 5182 is in use, choose a free local port and use it in the address below. Do not bind to `0.0.0.0`, start a Vite server alongside this app, forward the port, or put it behind a proxy.

## 3. Check the result

1. On the Windows PC, open **[http://127.0.0.1:5182/](http://127.0.0.1:5182/)**. In **Overview**, Web API should be **Online**, sample data **Fresh** on normal delivery, and MT5 **not connected**.
2. Click **Sample History**. Expect **Sample storage: Available**, **2 saved snapshots**, and default equity **$2,491.76**. Select **14:30:32 UTC**; equity should change to **$2,486.72**. **Example time** and **Saved to SQLite** are separate; the latter uses your original save time.
3. Click **Trade history**. It is still the separate closed-trade ledger of simulated examples, not the SQLite snapshots.
4. Stop Uvicorn with **Ctrl+C** and run just the Uvicorn line again. Open **Sample History** and confirm the two rows are still there, with the same save timestamps. No build or seed is needed to reopen.

Keep PowerShell open while using the page. If the v0.6 history service is still open at `127.0.0.1:5178`, it can stay open: the two apps only read the file. To keep using only v0.6, just stop the v0.7 service and use the old address. If you set `TICKFRAME_HISTORY_DB` for a nondefault path, it affects only processes launched from the current PowerShell window.

After this passes, the new source checkpoint can be [backed up to the existing private repository](HostingAndGitHub.md#update-the-existing-private-source-backup-after-the-local-check). Neither that push nor the bundle copies the database. See the [sandbox verification report](../Testing/LocalWorkspaceChecks.md) for the expected states and test limits.
