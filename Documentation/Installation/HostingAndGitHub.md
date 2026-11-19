# Private GitHub backup and low-cost testing

## Recommendation

**Use a private GitHub Free repository for source, keep using the Arena preview for browser feedback, and run persistent SQLite tests on the PC you already have.** Do not buy hosting for this stage. The repository is for code and Git history, not the running app or its database. No GitHub repository has been created or pushed from this workspace, and no new hosting service has been purchased or deployed.

| Option | Best use | Cost and limits |
|---|---|---|
| **Current Arena preview** | Click through the simulated UI now, without installing anything. | No new hosting account needed for this check. Treat the sandbox as temporary, not as an always-on service or an off-machine database backup. |
| **Local PC, loopback only — recommended** | Test saved history, SQLite persistence, restart, and backup restore. | No cloud-hosting fee if using the PC you already have; normal device/power costs still apply. It is reachable only from that PC and only while the test app runs. No router changes, port forwarding, or public tunnel. |
| **Render Free, if a public test URL is needed** | A disposable demo seeded from approved synthetic fixtures. Not set up yet. | Free within the plan’s limits. It can sleep after 15 minutes idle, has a cold start, and loses changes to local files, including SQLite, on restart, redeploy, or spin-down. Free web services cannot attach a persistent disk. If no payment method is added, quota exhaustion can suspend services or pause builds rather than incur charges. Check the current terms before opting in. [1](https://render.com/docs/free) [2](https://render.com/docs/faq) |

A private source repository does **not** make a deployed website private. Never publish broker records, real credentials, SQLite backups, the Access Lab’s identities, or trading controls to a public demo. A disposable demo may explicitly rebuild a copy from the two checked-in synthetic samples. If durable remote storage, a private site, or an always-on service becomes necessary, review requirements and total cost first. A web-service preview does not provide a Windows/MT5 terminal.

## Back up the source to GitHub when ready

GitHub Free supports private repositories. [1](https://docs.github.com/en/get-started/learning-about-github/githubs-plans) GitHub Pages is a static site service and cannot run this Python API and SQLite; do not make the source repository public to try it. [2](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

1. Keep the current **WebSampleHistory 0.6** ZIP as a second source copy. It includes clean tracked files and a verified Git bundle with `main` and the release tags. It excludes `.venv`, `node_modules`, builds, `LocalData`, SQLite databases, credentials and backups.
2. When ready, sign in to GitHub **in your own browser**. Enable two-factor authentication. Create an empty **Private** repository named `UltraShortTermTradingSystem`; do not initialize it with a README, license or `.gitignore`. Confirm it is labelled **Private**. There is no need for a paid plan for this source backup. [1](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)
3. Clone the included `UltraShortTermTradingSystem-web-sample-history.bundle` into a **new** working folder. The [Windows Git guide](WindowsSetup.md#git-and-the-starter-package--after-the-demo-check) explains how to clone and sign in from a local Git client; use this release’s bundle instead of the Stage 1 one. Confirm the tree is clean and the broker, database and secret paths are ignored before pushing. Change that clone’s `origin` to the exact HTTPS URL copied from your private repo. Verify the destination with `git remote -v` before running `git push -u origin main` and then `git push origin --tags`.
4. Verify the repo’s private label, `main` commit, and tags in the browser. Later, clone the private remote into a new folder once to prove that it restores the source. Keep the ZIP and separate tested database backups; a Git push does not copy runtime SQLite.

The connector is unavailable in this session; the GitHub action must happen through a signed-in browser and a local Git client. Never paste a password, token, recovery code, or a URL containing a token into chat. The hosted preview check is complete. Start with the empty **Private** repository only; verify that destination before pushing anything.

## Local follow-up

The [Sample History test report](../Testing/SampleHistoryChecks.md#optional-local-run) shows the local build and loopback command. Python uses its built-in SQLite library; a separate database server is not required. Running locally is a test option, not permission to connect a broker or advance Stage 1 or Stage 6.
