# Development workflow and rollback

How to change Tripora without risking a working site, and how to get back to a working version fast.

## The rule

> **Each Claude task must focus on one specified issue only. Do not perform unrelated refactoring or redesign.**

One task = one branch = one focused change. If you notice something else that needs fixing, write it down and do it as a separate task.

If a command was already failing **before** you started, do not fix it as part of an unrelated task: report it. If your change makes a previously passing command fail, stop, find the regression, revert your change, confirm the previous state works again, and report what happened.

## Standard feature workflow

```
restore point → feature branch → one focused change → lint → typecheck → tests → build → manual test → commit → merge
```

1. **Start from a clean, working `main`** (`git status` is clean; the checks below pass).
2. **Create a restore point** (see below).
3. **Create a feature branch.**
4. **Make one focused change.** No drive-by refactors, upgrades or redesigns.
5. **Run the checks** (below). All must pass.
6. **Manual test** the affected page or flow in a browser.
7. **Commit** with a clear message, then **merge** to `main` (pull request preferred; CI runs the same checks).

## 1. Create a restore point

A restore point is an annotated Git tag on a commit where everything passes.

```bash
git status                       # must be clean
npm run lint && npm run typecheck && npm test && npm run build

git tag -a restore/<short-name>-$(date +%Y%m%d) -m "Known-good: <what was verified>"
git push origin --tags           # keep a copy on GitHub
```

Tags are never moved or deleted. List them with `git tag -n1 -l "restore/*"`.

Current baseline: **`restore/baseline-20260919`**. Lint, typecheck, 52 unit and integration tests, and the production build were all passing when it was created. The 46 HTTP end-to-end tests pass against a running server (`npm run test:e2e`).

## 2. Create a feature branch

```bash
git switch main
git pull                          # if a remote is configured
git switch -c fix/short-description     # or feature/…, chore/…
```

## 3. Test before merging

`npm test` needs PostgreSQL reachable at `DATABASE_URL` and a seeded database (`npm run db:local` then `npx prisma migrate deploy && npm run db:seed` if you have no local Postgres).

```bash
npm run lint
npm run typecheck
npm test                          # unit + integration
npm run build

# HTTP end-to-end tests against the production build:
npx next start -p 3100 &
E2E_BASE_URL=http://localhost:3100 npm run test:e2e
```

Stop any running `npm run dev` before `npm run build` (they share the `.next` folder).

Manual test: `npm run dev` and try the pages and flows your change touches. For UI changes also check a phone-width viewport. Remember that each check that fails is information; do not weaken or delete a test to make it pass.

## 4. Roll back a broken change

Pick the smallest tool that works. **Prefer reverting over rewriting history**, and never force-push `main`.

### A. The bad change is still on a feature branch (not merged)

Just don't merge it. Delete or abandon the branch:

```bash
git switch main
git branch -D fix/short-description      # only if you are sure; commits remain in `git reflog` for a while
```

### B. Revert one bad commit (safe, keeps history)

```bash
git log --oneline -10                    # find the bad commit
git revert <commit-hash>                 # creates a new commit that undoes it
# for a merge commit: git revert -m 1 <merge-hash>
git push
```

Revert several commits: `git revert <oldest>^..<newest>`.

### C. Restore the whole site to a restore tag

Inspect it first (read-only, changes nothing):

```bash
git switch --detach restore/baseline-20260919
npm ci && npm run build            # confirm it works
```

Then make `main` match that tag **as a new commit** (history is preserved, no force-push needed):

```bash
git switch main
git revert --no-commit restore/baseline-20260919..HEAD
git commit -m "revert: restore site to restore/baseline-20260919"
git push
```

Alternative: put the tag's files back without touching history.

```bash
git switch main
git restore --source restore/baseline-20260919 --staged --worktree .
git commit -m "revert: restore files from restore/baseline-20260919"
```

Hosting: on Vercel you can also **promote a previous deployment** (Deployments → previous good build → Promote to Production) for an instant rollback while you fix Git.

### D. A database migration was part of the bad change

Code rollback does not undo schema changes. Prisma migrations are forward-only. Write a new migration that reverses the change, or restore the database from a backup/snapshot taken before deploying. Take a snapshot before any migration reaches production.

## 5. Verify after a rollback

```bash
git status                                  # clean
git log --oneline -5                        # the revert/restore commit is on top
npm ci
npm run lint && npm run typecheck && npm test && npm run build
npx next start -p 3100 &
E2E_BASE_URL=http://localhost:3100 npm run test:e2e
```

Then look at the site: home page renders, `/destinations/bali` loads, a discovery search returns results, `/trip-planner` gives an estimate, a booking button redirects (`/go/...` returns 302), and `/admin` still requires sign-in. Only after that, deploy.

## Do not

- Commit `.env` or any secret (only `.env.example` is tracked).
- Force-push `main`, or delete or move `restore/*` tags.
- Combine unrelated changes in one branch or commit.
- Edit an existing migration that has been applied anywhere; add a new one.
