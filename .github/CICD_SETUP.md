# GitHub Actions CI/CD Setup Guide

##  What Was Created

Two workflow files have been added to your repository:

### 1. **CI/CD Pipeline** (`.github/workflows/ci.yml`)

**Runs on every Pull Request and Push to main:**

| Job | What It Does | Time |
|-----|--------------|------|
|  Test Suite | Runs all 24 tests with Vitest | ~2 min |
|  TypeScript Check | Validates types with `tsc` | ~1 min |
|  Lint Check | Checks code style with ESLint | ~30 sec |
|  Build Check | Ensures production build succeeds | ~2 min |
|  Security Audit | Scans for vulnerable dependencies | ~30 sec |
|  Deploy | Auto-deploys to Vercel (main branch only) | ~3 min |
|  PR Comment | Posts results summary on PR | ~10 sec |

**Total time per run:** ~6 minutes

### 2. **Weekly Security Scan** (`.github/workflows/security-scan.yml`)

**Runs every Monday at 9 AM UTC:**

- Scans for security vulnerabilities
- Checks for outdated dependencies
- Creates GitHub issue if problems found

---

##  Quick Start

### Step 1: Commit the Workflows

```bash
# Workflows are already in your repo at:
# .github/workflows/ci.yml
# .github/workflows/security-scan.yml

# Commit them
git add .github/
git commit -m "ci: Add GitHub Actions CI/CD workflows"
git push origin main
```

**That's it!** Basic checks will now run on every PR.

---

##  Setup Vercel Auto-Deploy (Optional)

To enable automatic deployment to Vercel when you merge to main, you need to add secrets to GitHub.

### Step 1: Get Vercel Token

1. Go to: https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name: `GitHub Actions CI/CD`
4. Scope: `Full Account`
5. Click **"Create"**
6. **Copy the token** (you won't see it again!)

### Step 2: Get Vercel Project IDs

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (in Pawkit directory)
cd ~/Pawkit
vercel link

# This creates .vercel/project.json with:
# - projectId
# - orgId
```

Or get them from Vercel dashboard:
1. Go to: https://vercel.com/YOUR_USERNAME/pawkit/settings
2. **Project ID:** Copy from "General" tab
3. **Org ID:** Copy from URL or team settings

### Step 3: Add Secrets to GitHub

1. Go to: https://github.com/YOUR_USERNAME/Pawkit/settings/secrets/actions
2. Click **"New repository secret"**
3. Add these three secrets:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `VERCEL_TOKEN` | `ABC123...` | From Step 1 (Vercel token page) |
| `VERCEL_PROJECT_ID` | `prj_ABC123...` | From `.vercel/project.json` or Vercel dashboard |
| `VERCEL_ORG_ID` | `team_ABC123...` | From `.vercel/project.json` or Vercel dashboard |

**Screenshots guide:** https://vercel.com/guides/how-can-i-use-github-actions-with-vercel

### Step 4: Test It

```bash
# Make a small change
echo "# Test CI" >> README.md
git add README.md
git commit -m "test: Verify CI/CD works"
git push

# Go to: https://github.com/YOUR_USERNAME/Pawkit/actions
# You should see the workflow running!
```

---

##  What You'll See on GitHub

### On a Pull Request

When you open a PR, you'll see:

```
Checks
 Test Suite — All 24 tests passed (2m 15s)
 TypeScript Check — No type errors (1m 5s)
 Lint — Code style is clean (32s)
 Build — Production build succeeded (2m 43s)
 Security Audit — No vulnerabilities found (28s)

All checks have passed
```

Plus a bot comment:

```
##  CI/CD Results

All checks have passed! 

| Check | Status |
|-------|--------|
|  Tests |  Passed |
|  TypeScript |  Passed |
|  Lint |  Passed |
|  Build |  Passed |

Ready to merge! 
```

### On Merge to Main

After merging:

```
Checks (same as above)
 ... all checks pass

Plus:
 Deploy to Vercel — Deploying to production (3m 12s)
 Deployed to https://pawkit.app
```

You'll get a Vercel deployment URL automatically.

---

##  Customization

### Change When Workflows Run

Edit `.github/workflows/ci.yml`:

```yaml
# Run on PRs to main AND develop branches
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]
```

### Add Environment Variables for Tests

If your tests need env vars:

```yaml
- name:  Run tests
  run: pnpm test
  env:
    NODE_ENV: test
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    # Add more secrets as needed
```

Then add the secrets to GitHub (same process as Vercel secrets).

### Change Security Scan Schedule

Edit `.github/workflows/security-scan.yml`:

```yaml
# Run every day at 9 AM
schedule:
  - cron: '0 9 * * *'

# Or run every Friday at 5 PM
schedule:
  - cron: '0 17 * * 5'
```

Cron syntax: https://crontab.guru/

### Skip CI on Certain Commits

Add `[skip ci]` to commit message:

```bash
git commit -m "docs: Update README [skip ci]"
```

Workflow won't run (useful for documentation-only changes).

---

##  Troubleshooting

### "Workflow not running"

**Check:**
1. Did you push `.github/workflows/*.yml` files?
2. Are they in the right location?
3. Is the YAML syntax valid? (Use yamllint.com)

### "Build failing - Missing environment variables"

**Fix:** Add dummy values for CI builds:

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co'
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder'
```

Or add real secrets to GitHub Settings → Secrets.

### "Vercel deployment failing"

**Check:**
1. Did you add all 3 secrets? (TOKEN, PROJECT_ID, ORG_ID)
2. Is the Vercel token valid? (Check expiration)
3. Are the IDs correct? (Re-run `vercel link`)

### "Tests failing in CI but pass locally"

**Common causes:**
- Different Node.js version (check `node-version: '20'`)
- Missing environment variables
- Timezone differences
- Race conditions in tests

**Fix:** Run tests in CI mode locally:
```bash
NODE_ENV=test pnpm test
```

---

##  GitHub Actions Costs

### Free Tier (Public Repos)

 **2,000 minutes/month FREE**
 **Unlimited** for public repositories

### Your Usage Estimate

| Workflow | Frequency | Time | Monthly Usage |
|----------|-----------|------|---------------|
| CI/CD Pipeline | ~20 PRs/month | 6 min | 120 min |
| Weekly Security | 4/month | 2 min | 8 min |
| **Total** | — | — | **~130 min/month** |

**Cost:** $0 (well under 2,000 min limit)

### Private Repo Pricing

If you make the repo private:
- First 2,000 minutes/month: **Free**
- Additional minutes: **$0.008/minute**

Your usage would still be free.

---

##  Monitoring

### View Workflow Runs

https://github.com/YOUR_USERNAME/Pawkit/actions

### Check Specific Run

Click any workflow run to see:
- Which jobs passed/failed
- Logs for each step
- Artifacts (coverage reports)

### Email Notifications

By default, you get emails when:
-  Workflow fails (on your commits)
-  Workflow fixed (after it was failing)

Customize in: https://github.com/settings/notifications

---

##  What Happens Now

### On Every Pull Request

1. You push code
2.  Robots automatically run:
   - Tests
   - TypeScript check
   - Lint check
   - Build verification
   - Security scan
3. GitHub shows  or  on the PR
4. Bot posts summary comment
5. You can't merge until all checks pass

### On Every Merge to Main

1. Same checks as PR
2. **Plus:** Auto-deploy to Vercel
3. Live on production in ~10 minutes
4. Vercel posts deployment URL

### Every Monday at 9 AM

1. Security scan runs
2. Checks for vulnerabilities
3. Creates issue if problems found

---

##  Next Steps

1. **Commit workflows:**
   ```bash
   git add .github/
   git commit -m "ci: Add GitHub Actions CI/CD"
   git push
   ```

2. **Add Vercel secrets** (optional, for auto-deploy)

3. **Open a test PR** to see it in action

4. **Configure branch protection** (recommended):
   - Go to: Settings → Branches → Add rule
   - Branch name: `main`
   - Check: "Require status checks to pass"
   - Select: Test Suite, TypeScript Check, Lint, Build
   - Check: "Require branches to be up to date"
   - Save

   Now PRs **must** pass all checks before merging!

---

##  You're Done!

Your repository now has:
-  Automated testing on every PR
-  Code quality checks (TypeScript, lint)
-  Build verification
-  Security scanning
-  Optional auto-deployment to Vercel
-  PR status comments

**No more "forgot to run tests" bugs!** 

---

##  Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel GitHub Actions Guide](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)
- [Cron Schedule Helper](https://crontab.guru/)
- [YAML Validator](https://yamllint.com/)

---

**Questions?** Check the [Troubleshooting](#troubleshooting) section or ask in Discord!
