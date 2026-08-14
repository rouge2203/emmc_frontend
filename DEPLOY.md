# Deploy

The frontend deploys to **Vercel**. There is no manual deploy step and no CLI to
run — pushing to `main` *is* the deploy.

- Production: <https://www.emmcportal.com> (and `emmcportal.com`)
- API it talks to: <https://api.emmcportal.com> (see the `emmc_backend` repo)

## How to deploy

1. Run `npm run build` locally and make sure it passes. The build is
   `tsc -b && vite build`, so the type check *is* part of the build — a type
   error fails the deploy.
2. Commit to `main`.
3. `git push origin main`.

Vercel builds the pushed commit and promotes it to production automatically.

## Deploy the backend first

When a change spans both repos, push `emmc_backend` before this one. The
frontend is written to tolerate a backend that predates it — new response fields
are declared optional in `src/components/dashboard/types.ts` so a page renders
unchanged when the field is absent — but the reverse is not true.

## Configuration

- `vercel.json` rewrites every path to `/` so client-side routing survives a
  hard refresh. Without it a deep link such as `/admin/dashboard` 404s on
  Vercel.
- `VITE_API_BASE_URL` lives in the Vercel project settings, not in the repo.
  When it is unset the axios client falls back to `/api/`
  (`src/api/axios.ts`), which in development the Vite dev server proxies to
  `http://localhost:9000` (`vite.config.ts`) — so **Django must run on port
  9000 locally**, not the Django default of 8000.
- `.env` files are gitignored and must stay that way.

## Commit convention

**Never add Claude co-authoring trailers to commits.** No `Co-Authored-By:
Claude ...` line, no `Claude-Session:` line, and no "Generated with Claude Code"
footer — in commit messages or in PR descriptions.

Commit subjects are imperative and sentence-case (no `feat:`/`fix:` prefix), with
a bulleted body explaining *why* whenever the change is not self-evident. Run
`git log` for the house style.
