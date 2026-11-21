# Private GitHub backup and low-cost testing

**Keep the private GitHub repository for versioned source, Arena for standalone browser feedback, and the existing PC for persistent SQLite tests.** Do not buy hosting for this stage. A Git push does not copy runtime data or deploy a web service.

| Option | Best use | Cost and limits |
|---|---|---|
| **Existing Arena previews** | Review the simulated dashboard, Access Lab, or standalone Sample History without a local install. | No new hosting account needed. Treat the sandbox as temporary, not an always-on service or an off-machine data backup. |
| **Local PC, loopback only — recommended** | Use [one Tickframe workspace](LocalWorkspaceWindows.md) with saved Sample History. Test persistence, restart and backup restore on the machine that already holds the SQLite file. | No cloud-hosting fee with the existing PC; normal device/power costs still apply. The app is reachable only on that PC while it is running. No port forwarding or public tunnel. |
| **Render Free, only if a disposable public demo becomes necessary** | A reproducible demo containing only approved synthetic fixtures. Not provisioned. The loopback workspace is not for this deployment. | Free within plan limits. A free service can spin down after 15 idle minutes and loses local SQLite changes on restart, redeploy or spin-down; it cannot attach a persistent disk. Without a payment method, quota exhaustion can suspend services or pause builds. Review current terms before choosing. [1](https://render.com/docs/free) [2](https://render.com/docs/faq) |

A private source repository does **not** make a deployed website private. Never publish broker records, passwords, SQLite backups, Access Lab identities or trading controls. GitHub Free supports private repositories. [1](https://docs.github.com/en/get-started/learning-about-github/githubs-plans) GitHub Pages serves static sites, not FastAPI with SQLite; do not make the repo public to try it. [2](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) A hosted web service is not a Windows/MT5 terminal.

## Verified source checkpoint

The operator reported the repository is **Private**, pushed `main` and nine release tags from Windows, and restored `d55f065` and the nine tags into a clean `$HOME\Tickframe-restore` clone. This verified the v0.6 **source** backup. The v0.6 SQLite test separately passed on the working PC. No remote is configured in this workspace; no new hosting has been deployed or purchased.

Keep the v0.6 ZIP as a recovery copy. The new **WebLocalWorkspace 0.7** ZIP and its Git bundle include clean tracked source and the milestone history, including `web-local-workspace-v0.7`. The v0.7 release is prepared locally; its Windows check and GitHub backup are pending. The packages exclude `.venv`, `node_modules`, generated builds, `LocalData`, SQLite files, credentials and backups.

## Update the existing private source backup after the local check

1. Complete the [v0.7 Windows check](LocalWorkspaceWindows.md) in `$HOME\Tickframe`. Keep `LocalData` and database backups out of Git; do not create another repo or copy the database into the clone's tracked paths.
2. On the Windows PC, verify the repository still shows **Private** in your own browser and your local working copy is clean at `web-local-workspace-v0.7`. Check `git remote -v` locally against that exact private URL. Never paste an authentication URL, token, recovery code or password into chat.
3. From `$HOME\Tickframe`, push only after verifying the destination. Use normal, not forced, updates:

   ```powershell
   git push origin main
   git push origin web-local-workspace-v0.7
   ```

4. Confirm the new `main` and `web-local-workspace-v0.7` tag in GitHub. A clean clone into a **separate** folder can verify source restore again. Never use a clean clone as a replacement for the working copy holding SQLite. Keep the ZIP and separately verified data backups; they serve different purposes.

Running v0.7 locally does not require pushing, reinstalling MT5, a broker login, or advancing Stage 1 or Stage 6.
