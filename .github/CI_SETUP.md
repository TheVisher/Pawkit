# GitHub Actions CI Setup Guide

##  What Was Created

Two workflow files have been added to your repository:

### 1. **CI Pipeline** (`.github/workflows/ci.yml`)

**Runs on every Pull Request and Push to main:**

| Job | What It Does | Time |
|-----|--------------|------|
|  Test Suite | Runs all 24 tests with Vitest | ~2 min |
|  TypeScript Check | Validates types with `tsc` | ~1 min |
|  Lint Check | Checks code style with ESLint | ~30 sec |
|  Build Check | Ensures production build succeeds | ~2 min |
|  Security Audit | Scans for vulnerable dependencies | ~30 sec |
|  PR Comment | Posts results summary on PR | ~10 sec |

**Total time per run:** ~6 minutes

**Note:** Deployment is handled by Vercel's built-in GitHub integration (no setup needed!)

### 2. **Weekly Security Scan** (`.github/workflows/security-scan.yml`)

**Runs every Monday at 9 AM UTC:**

- Scans for security vulnerabilities
- Checks for outdated dependencies
- Creates GitHub issue if problems found

---

##  Quick Start

### Activate CI

Just commit and push:

```bash
# All files are already in your repo at:
# .github/workflows/ci.yml
# .github/workflows/security-scan.yml

# Commit them
git add .github/
git commit -m "ci: Add GitHub Actions CI workflows"
git push origin main
```

**That's it!** The checks will now run on every PR.

---

##  How It Works with Vercel

### Your Current Setup (Vercel Native)

```
You push to GitHub
    ↓
Vercel watches repo
    ↓
Deploys automatically 
```

### New Setup (CI + Vercel)

```
You push to GitHub
    ↓
GitHub Actions runs checks (6 min)
├─ Tests
├─ TypeScript
├─ Lint
├─ Build
└─ Security
    ↓
Vercel deploys (happens in parallel) 
```

**Key point:** Vercel still auto-deploys, but now you also get:
-  Automated testing on every PR
-  Red/green status badges
-  Bot comments with results
-  Can't merge if checks fail (optional)

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
##  CI Results

All checks have passed! 

| Check | Status |
|-------|--------|
|  Tests |  Passed |
|  TypeScript |  Passed |
|  Lint |  Passed |
|  Build |  Passed |

Vercel will auto-deploy when merged to main. Ready to merge! 
```

### On Merge to Main

After merging:

```
 All CI checks pass (GitHub Actions)
 Vercel deploys to production (Vercel's native integration)
```

Both happen, but they're independent. Vercel doesn't wait for CI to finish.

---

##  Optional: Protect Main Branch

Want to **prevent merging** if tests fail?

1. Go to: `Settings → Branches → Add rule`
2. Branch name: `main`
3. Check:  **Require status checks to pass before merging**
4. Select these checks:
   - Test Suite
   - TypeScript Check
   - Lint
   - Build
5. Check:  **Require branches to be up to date before merging**
6. **Save**

Now you **can't merge** a PR unless all checks are green! 

**Vercel will still try to deploy**, but broken code won't make it to `main`.

---

##  Customization

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

Workflow won't run (useful for docs-only changes).

### Add Environment Variables for Tests

If your tests need env vars, edit `.github/workflows/ci.yml`:

```yaml
- name:  Run tests
  run: pnpm test
  env:
    NODE_ENV: test
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    # Add more as needed
```

Then add the secrets in GitHub Settings → Secrets and variables → Actions.

---

##  Troubleshooting

### "Workflow not running"

**Check:**
1. Did you push `.github/workflows/*.yml` files?
2. Is the YAML syntax valid? (Use yamllint.com)
3. Check the Actions tab on GitHub

### "Build failing - Missing environment variables"

**This is normal!** The build uses dummy values:

```yaml
NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
```

These are enough to build (not run) the app.

If you get other errors, you might need to add real secrets to GitHub.

### "Tests failing in CI but pass locally"

**Common causes:**
- Different Node.js version
- Missing dependencies
- Timezone differences

**Debug:** Check the Actions logs on GitHub for exact error.

---

##  GitHub Actions Costs

### Free Tier (Public Repos)

 **2,000 minutes/month FREE**
 **Unlimited** for public repositories

### Your Usage Estimate

| Workflow | Frequency | Time | Monthly Usage |
|----------|-----------|------|---------------|
| CI Pipeline | ~20 PRs/month | 6 min | 120 min |
| Weekly Security | 4/month | 2 min | 8 min |
| **Total** | — | — | **~130 min/month** |

**Cost:** $0 (well under 2,000 min limit)

---

##  Monitoring

### View Workflow Runs

https://github.com/YOUR_USERNAME/Pawkit/actions

### Check Specific Run

Click any workflow run to see:
- Which jobs passed/failed
- Logs for each step
- Coverage reports (if uploaded)

---

##  What You Get

### Without CI (Before)
```
Push code → Hope tests pass → Merge → Hope nothing breaks
```

### With CI (Now)
```
Push code →  Robots test everything → / Clear status → Merge confidently
```

**Benefits:**
-  Can't forget to run tests
-  Catch bugs before merging
-  Professional workflow
-  Clear PR status
-  Free for public repos

---

##  Next Steps

1. **Commit workflows:**
   ```bash
   git add .github/
   git commit -m "ci: Add GitHub Actions CI"
   git push
   ```

2. **Open a test PR** to see it in action

3. **Add branch protection** (optional but recommended)

---

##  FAQ

**Q: Will CI slow down my deployment?**  
A: No! Vercel deploys in parallel. CI just adds checks to your PRs.

**Q: Do I need to wait for CI before merging?**  
A: Not required, but recommended. You can enforce this with branch protection rules.

**Q: Can I disable CI temporarily?**  
A: Yes! Add `[skip ci]` to your commit message.

**Q: What if I want to deploy only after checks pass?**  
A: You'd need to disable Vercel's auto-deploy and use GitHub Actions to deploy instead. But your current setup is simpler.

---

##  Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [YAML Validator](https://yamllint.com/)
- [Cron Schedule Helper](https://crontab.guru/)

---

**Questions?** Open an issue or check the Actions logs for debugging!
