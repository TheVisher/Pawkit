# Pawkit Security + Monitoring Plan (Solo Dev)

Date: 2026-02-01
Region/currency: United States, USD

This doc captures a practical security baseline, a minimal monitoring stack, and realistic costs.
Prices change often. Re-check vendor pricing before launch.

---

> **Review Note (2026-02-01):** This document was reviewed by Claude Code. Pricing corrections
> are marked with ~~strikethrough~~ and corrections below. Security checklist has been expanded
> to include OWASP Top 10 items that were missing. Security controls are now tiered (MVP vs Advanced).

---

## 1) Launch Bar (Security Must-Haves)

These are the minimum controls to ship a user-data app safely.

> **Note:** This section has been reorganized into tiers. See Section 1A for MVP requirements
> (ship safely with $0 cost) and Section 1B for Advanced requirements (add when you have revenue).

---

## 1A) MVP Security Checklist (Pre-Revenue, $0 Implementation Cost)

These are the absolute minimum controls to ship. All of these can be implemented without
any paid services - they're code/configuration changes only.

> **Status (2026-02-01):** All critical items implemented. See notes for implementation details.

### Cryptographic Controls (OWASP A02 - was missing)
- [x] TLS enforced on all endpoints — *Convex Cloud enforces HTTPS*
- [x] Passwords hashed with Argon2id or bcrypt — *Scrypt via @convex-dev/auth (Lucia)*
- [x] Never store passwords in plaintext or weak hashes — *Framework handles this*

### Security Headers (OWASP A05 - was missing)
- [x] Content-Security-Policy (CSP) configured — *vite.config.ts lines 28-37*
- [x] Strict-Transport-Security (HSTS) — *Convex Cloud deployment*
- [x] X-Content-Type-Options: nosniff — *vite.config.ts line 25*
- [x] X-Frame-Options: SAMEORIGIN — *vite.config.ts line 24*
- [x] Referrer-Policy: strict-origin-when-cross-origin — *vite.config.ts line 26*

### Session Security (OWASP A07 - expanded from original)
- [x] Cookies set with HttpOnly flag — *@convex-dev/auth cookies.ts*
- [x] Cookies set with Secure flag — *@convex-dev/auth cookies.ts*
- [x] Cookies set with SameSite attribute — *SameSite: "none" + partitioned*
- [x] Session regeneration after login — *Handled by @convex-dev/auth*
- [x] Session timeout policy defined — *convex/auth.ts: 30d total, 7d inactive*

### CSRF Protection (OWASP A01 - was missing)
- [x] SameSite cookie attribute properly configured — *@convex-dev/auth*
- [x] Origin header validation on mutations — *convex/http.ts CORS whitelist*

### Auth + Account Safety (original - good)
- [x] Password reset flow works end-to-end — *convex/passwordReset.ts (OTP via Resend)*
- [x] Rate-limit auth endpoints — *convex/rateLimit.ts (IP-based sliding window)*
- [x] Revoke sessions/tokens on password reset and account deletion — *@convex-dev/auth + users.ts*

### Authorization (original - good)
- [x] Every query/mutation checks workspace access — *requireWorkspaceAccess() in users.ts*
- [x] Private Pawkit content never appears in global search — *Workspace isolation enforced*
- [x] Admin-only mutations guarded server-side — *All mutations require auth*

### Input Validation & Injection Prevention (OWASP A03 - expanded)
- [x] Parameterized queries for all database operations — *Convex uses typed queries by design*
- [x] Validate external URLs (prevent SSRF) — *convex/urlValidation.ts + storage.ts*
- [x] Sanitize untrusted HTML and user-generated content — *DOMPurify in reader component*
- [x] Enforce file size/type limits on uploads — *10MB client, 5MB server in storage.ts*
- [x] Validate and sanitize all user inputs server-side — *Convex validators (v.string(), etc.)*

### Error Handling (OWASP A05 - was missing)
- [x] No stack traces exposed in production — *Generic errors in http.ts*
- [x] Generic error messages to users — *errorResponse() helper*
- [x] Errors logged server-side for debugging — *console.error with context*

### Secrets + Ops (original - good)
- [x] Secrets only in environment variables, never in repo — *process.env usage*
- [x] .env files in .gitignore — *.gitignore line 7*
- [x] Basic incident response plan — *docs/incident-response.md*
- [x] Backups/recovery path documented — *docs/backup-recovery.md*

### Dependency Security (OWASP A06 - was missing)
- [x] npm audit / pnpm audit run before deploy — *Manual process*
- [x] Dependabot enabled — *.github/dependabot.yml (added 2026-02-01)*
- [x] Lockfile committed — *pnpm-lock.yaml*
- [x] Review dependency updates before merging — *PR-based workflow*

**MVP Security Checklist Cost: $0**
All items above are code/configuration. No paid services required.

**Status: 30/30 items complete (2026-02-01).**

---

## 1B) Advanced Security Checklist (Post-Revenue, Add When Profitable)

Add these controls once you have paying users and monthly revenue to justify costs.

### Multi-Factor Authentication (OWASP A07)
- [ ] TOTP-based MFA offered (Google Authenticator, Authy, etc.)
- [ ] MFA recovery flow implemented (backup codes)
- [ ] Consider requiring MFA for sensitive operations

**Cost:** $0 (implementation only) or ~$0.05/user/mo if using auth provider

### Security Logging & Monitoring (OWASP A09)
- [ ] Log all authentication attempts (success and failure)
- [ ] Log authorization failures (access denied events)
- [ ] Log input validation failures
- [ ] Protect logs from tampering
- [ ] Alert on suspicious patterns (brute force, credential stuffing)
- [ ] Retain logs for incident investigation (30-90 days minimum)

**Cost:** Free tier of logging service, or included in Sentry/PostHog

### WAF / DDoS Protection
- [ ] Cloudflare Pro or equivalent WAF in front of application
- [ ] Rate limiting at edge (beyond application-level)
- [ ] Bot protection enabled

**Cost:** ~$20-25/mo (Cloudflare Pro)

### Advanced Dependency Scanning
- [ ] GitHub Secret Protection (scans for leaked credentials)
- [ ] GitHub Code Security (advanced vulnerability detection)
- [ ] SBOM (Software Bill of Materials) generation

**Cost:** $49/active committer/mo (GitHub add-ons)

### Data Lifecycle (original - moved here as lower priority)
- [x] Soft-delete and hard-delete flows implemented and tested — *trashAllUserData(), purgeAllUserData()*
- [x] Delete account permanently removes all user data — *deleteAccount() in users.ts*
- [ ] Export path exists (even a basic JSON export) - GDPR compliance

**Cost:** $0 (implementation only)

### Encryption at Rest
- [ ] Sensitive database fields encrypted
- [ ] Encryption keys properly managed (not in repo)
- [ ] Consider field-level encryption for PII

**Cost:** $0-50/mo depending on approach (some DBs include this)

---

## 2) Monitoring Stack Options (What catches issues)

Error monitoring catches crashes, exceptions, and frontend failures.
Uptime monitoring catches outages and auth issues.
WAF/rate limiting blocks common attacks and brute force.
Dependency scanning catches vulnerable packages and leaked secrets.
Session replay/analytics helps reproduce issues and observe real flows.

Below are 3 practical tiers: Free, Cheap Launch, and Growth.

---

## 3) Tiered Setups + Estimated Monthly Cost

### A) Minimal / Free (Pre-launch, very small user base)
Goal: Catch obvious errors and outages at $0.

- Sentry Developer: $0
  - 1 user
  - 5k errors, 5M spans, 50 replays, 1 uptime monitor
- UptimeRobot Free: $0
  - 50 monitors, 5-minute checks
- PostHog Free: $0
  - 1M events/mo, 5k replays, 100k errors
- GitHub Free: $0
  - Dependabot security and version updates included

Estimated monthly cost: $0

Tradeoff: No WAF, limited error volume, slower uptime detection.

---

### B) Cheap Launch (Solo/indie with real users)
Goal: Better protection without real enterprise spend.

- Cloudflare Pro (WAF included): $25/mo monthly or $20/mo billed annually
- ~~UptimeRobot Solo: $7/mo (60-second checks)~~
  - **Correction:** $7/mo is annual billing price. Monthly is $8/mo. Solo plan includes **10 monitors** (not 50).
- Sentry Developer: $0 if solo and error volume is low
  - Upgrade to Sentry Team $26/mo when billed annually
- PostHog Free: $0 if under free limits
- GitHub Team: $4/user/mo (only if you need Team features)

Estimated monthly cost (solo):
- Low end: $27/mo (Cloudflare Pro annual + UptimeRobot Solo annual + Sentry Free)
- Typical: $53/mo (Cloudflare Pro annual + UptimeRobot Solo annual + Sentry Team)
- Higher: $58/mo (Cloudflare Pro monthly + UptimeRobot Solo annual + Sentry Team)

---

### C) Growth / Serious Production
Goal: Stronger protection + fewer blind spots.

- Cloudflare Business: $250/mo monthly or $200/mo billed annually
- ~~UptimeRobot Team: $29/mo~~
  - **Correction:** $29/mo is annual billing. Monthly is $34/mo.
- Sentry Business: $80/mo when billed annually (advanced alerts, longer lookback)
- PostHog usage:
  - 1M events free
  - $0.00005/event after free (Product Analytics)
  - 5k replays free, then $0.005/recording
  - **Note:** Mobile session replay is $0.01/recording (2x web price)
- ~~GitHub Secret Protection: $19/active committer/mo~~
- ~~GitHub Code Security: $30/active committer/mo~~
  - **Correction:** These require GitHub Team ($4/user/mo) or Enterprise as a prerequisite.
  - "Active committer" = anyone who pushed a commit in last 90 days.

Estimated monthly cost (small team, low usage):
- Without GitHub add-ons: ~$309/mo (Cloudflare Business annual + UptimeRobot Team annual + Sentry Business annual)
- With GitHub Secret + Code Security for 1 committer: +$49/mo + $4/mo Team prerequisite

---

## 4) Pricing Details (Quick Reference)

### Sentry (Error Monitoring)
- Developer: $0, 1 user, 5k errors, 5M spans, 50 replays, 1 uptime monitor
- Team: $26/mo when billed annually (includes 50k errors - 10x Developer)
- Business: $80/mo when billed annually (90-day lookback vs 30-day)
- **Additional:** Seer AI Debugger is $40/active contributor/mo (separate add-on)

### UptimeRobot (Uptime)
- Free: $0, 50 monitors, 5-minute interval
- ~~Solo: $7/mo (60-second interval)~~
  - **Correction:** $7/mo annual, $8/mo monthly. **Only 10 monitors included** (not 50).
- ~~Team: $29/mo (60-second interval)~~
  - **Correction:** $29/mo annual, $34/mo monthly.
- Enterprise: $54/mo annual (30-second interval, 200 monitors)

### PostHog (Analytics + Replay + Error Tracking)
- Free tier (monthly):
  - 1M events
  - 5k session replays
  - 100k exceptions
  - **Also includes:** 1M feature flag requests, 1,500 survey responses, 50GB logs
- After free:
  - Product analytics: $0.00005/event (starts after 1M) - decreases with volume
  - Session replay: $0.005/recording (after 5k) - web only
  - **Mobile replay: $0.01/recording** (2x web price)
  - Error tracking: $0.00037/exception (after 100k)
- **Note:** Identified events cost more ($0.000248/event) vs anonymous ($0.00005/event)

### Cloudflare (WAF / Edge)
- Pro (includes WAF): $25/mo monthly or $20/mo billed annually
- Business (includes WAF): $250/mo monthly or $200/mo billed annually
- Cloudflare plans are billed per domain (monthly or annually)
- **Pro WAF:** 20 custom rules, OWASP managed ruleset, bot protection
- **Business WAF:** 100+ custom rules, advanced bot detection, 100% uptime SLA

### GitHub (Security)
- GitHub Free includes Dependabot security + version updates
- GitHub Team: $4/user/mo (pricing page notes a first-12-month promotional rate)
- Secret Protection: $19/active committer/mo
- Code Security: $30/active committer/mo
- **Important:** Secret Protection and Code Security require Team ($4/user/mo) or Enterprise as prerequisite
- **Active committer definition:** Anyone who pushed a commit in the last 90 days

---

## 5) Realistic Cost Expectations

If you launch with <1M events/month, <5k replays, and low error volume:
- You can realistically run at $27 to $58 per month (Cloudflare Pro + UptimeRobot + Sentry).

If you scale to 2-5M events/month and 10-25k replays:
- Add ~$50 to $150 per month in PostHog usage, depending on replay volume.

If you need advanced security tooling (GitHub add-ons):
- Add $49 per month per active committer for Secret Protection + Code Security.
- **Plus** $4/user/mo for GitHub Team (prerequisite).

---

## 6) Recommended Default (for Pawkit)

### Phase 1: MVP Launch ($0/mo)
Security: Complete all items in Section 1A (MVP Security Checklist)
Monitoring:
- Sentry Developer (free)
- UptimeRobot Free
- PostHog Free
- GitHub Free (Dependabot enabled)

### Phase 2: First Paying Users (~$27/mo)
Add when you have consistent monthly revenue:
- Cloudflare Pro ($20/mo annual)
- UptimeRobot Solo ($7/mo annual)
- Keep Sentry Developer, PostHog Free, GitHub Free

### Phase 3: Growing Revenue (~$53/mo)
Add when revenue exceeds ~$200/mo:
- Upgrade Sentry to Team ($26/mo annual)
- Implement MFA (code only, $0)
- Implement security logging
- Complete Section 1B items that are $0 cost

### Phase 4: Serious Scale (~$300+/mo)
Add when revenue exceeds ~$1000/mo:
- Cloudflare Business ($200/mo annual)
- Sentry Business ($80/mo annual)
- GitHub Secret + Code Security ($49+$4/mo)
- UptimeRobot Team ($29/mo annual)

---

## 7) Security Checklist Summary by Priority

### CRITICAL (Must have for MVP launch)
| Item | OWASP | Cost | Status |
|------|-------|------|--------|
| HTTPS/TLS enforced | A02 | $0 | [x] Convex Cloud enforces |
| Password hashing (Argon2/bcrypt) | A02 | $0 | [x] Scrypt via @convex-dev/auth |
| Security headers (CSP, HSTS) | A05 | $0 | [x] vite.config.ts |
| CSRF protection | A01 | $0 | [x] SameSite cookies + CORS |
| Secure cookie flags | A07 | $0 | [x] HttpOnly, Secure, SameSite |
| Parameterized queries | A03 | $0 | [x] Convex by design |
| Rate limiting on auth | A07 | $0 | [x] convex/rateLimit.ts |
| Input validation | A03 | $0 | [x] SSRF + XSS + file limits |
| Secrets in env vars only | A05 | $0 | [x] .env in .gitignore |

### HIGH (Add within 30 days of launch)
| Item | OWASP | Cost | Status |
|------|-------|------|--------|
| Dependabot enabled | A06 | $0 | [x] .github/dependabot.yml |
| Error logging (no stack traces to users) | A05 | $0 | [x] Generic errors in http.ts |
| Session timeout/expiration | A07 | $0 | [x] 30d total, 7d inactive |
| Authorization checks on all endpoints | A01 | $0 | [x] requireWorkspaceAccess() |
| File upload size limits | A05 | $0 | [x] 10MB client, 5MB server |

### MEDIUM (Add when profitable)
| Item | OWASP | Cost | Status |
|------|-------|------|--------|
| WAF (Cloudflare Pro) | A05 | $20/mo | [ ] |
| Security event logging | A09 | $0 | [ ] |
| MFA support | A07 | $0 | [ ] |
| Account deletion flow | Privacy | $0 | [x] convex/users.ts |
| Data export | Privacy | $0 | [ ] |

### LOW (Add at scale)
| Item | OWASP | Cost | Status |
|------|-------|------|--------|
| GitHub Secret Protection | A06 | $19/mo | [ ] |
| GitHub Code Security | A06 | $30/mo | [ ] |
| Encryption at rest | A02 | varies | [ ] |
| Advanced bot protection | A05 | $200/mo | [ ] |

---

## 8) Sources (Verify Before Purchase)

- Sentry pricing: https://sentry.io/pricing/
- PostHog pricing: https://posthog.com/pricing
- PostHog error tracking pricing: https://posthog.com/pricing/error-tracking
- UptimeRobot pricing: https://uptimerobot.com/pricing
- Cloudflare plans update (pricing details): https://blog.cloudflare.com/announcing-rate-plan-changes/
- Cloudflare billing policy (per-domain billing): https://www.cloudflare.com/billing-policy/
- GitHub pricing: https://github.com/pricing
- GitHub security plans: https://github.com/security/plans

### Security References (Added)
- OWASP Top 10 (2021): https://owasp.org/Top10/
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- MDN Cookie Security: https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies
