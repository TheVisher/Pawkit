# Pawkit Incident Response Plan

Last updated: 2026-02-01

## Contacts

- **Primary responder:** You (solo dev)
- **Alerts via:** Sentry, UptimeRobot, user reports

## Severity Levels

| Level | Examples | Response Time |
|-------|----------|---------------|
| **Critical** | Site down, data breach, auth broken, payment issues | Immediately |
| **High** | Major feature broken, error rate spiking | Within hours |
| **Medium** | Minor bug, single user affected | Within 1-2 days |
| **Low** | UI glitch, typo, non-blocking issue | Next sprint |

## Immediate Actions by Incident Type

### Site Down
1. Check Convex dashboard status: https://dashboard.convex.dev
2. Check Convex status page: https://status.convex.dev
3. Check your deployment logs for errors
4. If Convex is up, check your latest deployment for breaking changes
5. Rollback: Convex dashboard → Deployments → Deploy previous version

### Suspected Security Breach
1. **Don't panic.** Document what you know before acting.
2. Revoke all user sessions:
   - Convex dashboard → Data → `authSessions` table → Delete all (nuclear option)
   - Or deploy code that invalidates sessions by changing session secret
3. Rotate all secrets:
   - `AUTH_RESEND_KEY` - regenerate in Resend dashboard
   - Any other API keys in Convex environment variables
4. Check logs for unauthorized access patterns
5. If user PII was exposed, prepare notification (required within 72 hours in many jurisdictions)

### Auth Not Working
1. Check Convex logs for auth errors
2. Verify `AUTH_RESEND_KEY` is valid (test in Resend dashboard)
3. Check `authAccounts` and `authSessions` tables for anomalies
4. Verify cookie settings haven't changed

### Error Rate Spiking
1. Check Sentry for error patterns
2. Identify: Is it one user, one feature, or everyone?
3. Check recent deployments - did something just ship?
4. If recent deploy caused it, rollback immediately

## Rollback Process

**Convex (backend):**
1. Go to https://dashboard.convex.dev
2. Select Pawkit project
3. Go to Deployments
4. Click "Deploy" on a previous working version

**Frontend (if separate):**
- Revert git commit and redeploy, or
- Use hosting provider's rollback feature (Vercel, Netlify, etc.)

## Post-Incident

After any Critical or High incident:
1. Write a brief note: What happened? What fixed it? How to prevent it?
2. Add to this doc or a `docs/incidents/` folder
3. If it revealed a gap, add a task to fix it

## Useful Links

- Convex Dashboard: https://dashboard.convex.dev
- Convex Status: https://status.convex.dev
- Sentry: https://sentry.io (when configured)
- Resend Dashboard: https://resend.com/dashboard
