# Pawkit Security + Monitoring Plan (Solo Dev)

Date: 2026-02-01
Region/currency: United States, USD

This doc captures a practical security baseline, a minimal monitoring stack, and realistic costs.
Prices change often. Re-check vendor pricing before launch.

---

## 1) Launch Bar (Security Must-Haves)

These are the minimum controls to ship a user-data app safely.

### Auth + Account Safety
- Password reset flow works end-to-end.
- Rate-limit auth endpoints (login, reset, verify, resend).
- Revoke sessions/tokens on password reset and account deletion.

### Authorization
- Every query/mutation checks workspace access.
- Private Pawkit content never appears in global search or non-private views.
- Admin-only mutations guarded server-side.

### Data Lifecycle
- Soft-delete and hard-delete flows implemented and tested.
- Delete account permanently removes all user data.
- Export path exists (even a basic JSON export).

### Abuse & Input Safety
- Validate external URLs (prevent SSRF).
- Sanitize untrusted HTML and user-generated content.
- Enforce file size/type limits on uploads.

### Secrets + Ops
- Secrets only in environment variables, never in repo.
- Basic incident response plan: who gets alerted, how to roll back.
- Backups/recovery path documented (even if manual).

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
- UptimeRobot Solo: $7/mo (60-second checks)
- Sentry Developer: $0 if solo and error volume is low
  - Upgrade to Sentry Team $26/mo when billed annually
- PostHog Free: $0 if under free limits
- GitHub Team: $4/user/mo (only if you need Team features)

Estimated monthly cost (solo):
- Low end: $27/mo (Cloudflare Pro annual + UptimeRobot Solo + Sentry Free)
- Typical: $53/mo (Cloudflare Pro annual + UptimeRobot Solo + Sentry Team)
- Higher: $58/mo (Cloudflare Pro monthly + UptimeRobot Solo + Sentry Team)

---

### C) Growth / Serious Production
Goal: Stronger protection + fewer blind spots.

- Cloudflare Business: $250/mo monthly or $200/mo billed annually
- UptimeRobot Team: $29/mo
- Sentry Business: $80/mo when billed annually (advanced alerts, longer lookback)
- PostHog usage:
  - 1M events free
  - $0.00005/event after free (Product Analytics)
  - 5k replays free, then $0.005/recording
- GitHub Secret Protection: $19/active committer/mo
- GitHub Code Security: $30/active committer/mo

Estimated monthly cost (small team, low usage):
- Without GitHub add-ons: ~$309/mo (Cloudflare Business annual + UptimeRobot Team + Sentry Business annual)
- With GitHub Secret + Code Security for 1 committer: +$49/mo

---

## 4) Pricing Details (Quick Reference)

### Sentry (Error Monitoring)
- Developer: $0, 1 user, 5k errors, 5M spans, 50 replays, 1 uptime monitor
- Team: $26/mo when billed annually
- Business: $80/mo when billed annually

### UptimeRobot (Uptime)
- Free: $0, 50 monitors, 5-minute interval
- Solo: $7/mo (60-second interval)
- Team: $29/mo (60-second interval)

### PostHog (Analytics + Replay + Error Tracking)
- Free tier (monthly):
  - 1M events
  - 5k session replays
  - 100k exceptions
- After free:
  - Product analytics: $0.00005/event (starts after 1M)
  - Session replay: $0.005/recording (after 5k)
  - Error tracking: $0.00037/exception (after 100k)

### Cloudflare (WAF / Edge)
- Pro (includes WAF): $25/mo monthly or $20/mo billed annually
- Business (includes WAF): $250/mo monthly or $200/mo billed annually
- Cloudflare plans are billed per domain (monthly or annually)

### GitHub (Security)
- GitHub Free includes Dependabot security + version updates
- GitHub Team: $4/user/mo (pricing page notes a first-12-month promotional rate)
- Secret Protection: $19/active committer/mo
- Code Security: $30/active committer/mo

---

## 5) Realistic Cost Expectations

If you launch with <1M events/month, <5k replays, and low error volume:
- You can realistically run at $27 to $58 per month (Cloudflare Pro + UptimeRobot + Sentry).

If you scale to 2-5M events/month and 10-25k replays:
- Add ~$50 to $150 per month in PostHog usage, depending on replay volume.

If you need advanced security tooling (GitHub add-ons):
- Add $49 per month per active committer for Secret Protection + Code Security.

---

## 6) Recommended Default (for Pawkit)

Start with:
- Cloudflare Pro
- UptimeRobot Solo
- Sentry Developer (upgrade to Team when needed)
- PostHog Free
- GitHub Free (Team only if you need team permissions)

Add later if needed:
- GitHub Secret Protection + Code Security (per committer)
- Cloudflare Business (if you need SLA + advanced WAF)
- PostHog paid usage (if you exceed free tiers)

---

## 7) Sources (Verify Before Purchase)

- Sentry pricing: https://sentry.io/pricing/
- PostHog pricing: https://posthog.com/pricing
- PostHog error tracking pricing: https://posthog.com/pricing/error-tracking
- UptimeRobot pricing: https://uptimerobot.com/pricing
- Cloudflare plans update (pricing details): https://blog.cloudflare.com/announcing-rate-plan-changes/
- Cloudflare billing policy (per-domain billing): https://www.cloudflare.com/billing-policy/
- GitHub pricing: https://github.com/pricing
- GitHub security plans: https://github.com/security/plans
