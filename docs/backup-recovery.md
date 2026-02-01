# Pawkit Backup & Recovery

Last updated: 2026-02-01

## What's Backed Up

### Convex (Database + File Storage)
- **Automatic backups:** Yes, Convex handles this automatically
- **Retention:** Check current policy at https://docs.convex.dev
- **Point-in-time recovery:** Available on paid plans
- **How to restore:** Contact Convex support or use dashboard

### Code (GitHub)
- **Automatic backups:** Git history is your backup
- **Recovery:** `git checkout <commit>` or `git revert`

### Environment Variables
- **Convex env vars:** Stored in Convex dashboard (not in git)
- **Recovery:** Must be manually reconfigured if lost
- **Recommendation:** Keep a secure copy (1Password, etc.) of:
  - `AUTH_RESEND_KEY`
  - `AUTH_EMAIL`
  - Any other production secrets

## What's NOT Backed Up

| Service | What's Lost | Impact |
|---------|-------------|--------|
| Resend | Email send history | Can't replay sent emails |
| Sentry | Error history | Lose debugging context |
| PostHog | Analytics data | Lose usage insights |

These are acceptable losses - the critical user data is in Convex.

## Recovery Scenarios

### "I accidentally deleted user data"
1. **Soft-deleted?** Check `deleted: true` items, restore via mutation
2. **Hard-deleted?** Contact Convex support for point-in-time recovery
3. **Prevention:** Soft-delete first, hard-delete after 30 days

### "I broke the database schema"
1. Convex migrations are additive - old data still exists
2. Deploy a fix or rollback the deployment
3. If data was corrupted, contact Convex support

### "I lost my environment variables"
1. Check if you have them in a password manager
2. Regenerate keys in each service's dashboard:
   - Resend: https://resend.com/api-keys
3. Update in Convex dashboard → Settings → Environment Variables

### "Convex is down"
1. Check https://status.convex.dev
2. Nothing you can do but wait - this is the tradeoff of managed services
3. Communicate with users if extended (Twitter, status page, etc.)

## Backup Verification

Quarterly (set a calendar reminder):
- [ ] Confirm Convex backups are enabled (check dashboard)
- [ ] Verify you can access Convex deployment history
- [ ] Confirm you have current env vars saved securely
- [ ] Test that you know how to rollback a deployment

## Convex-Specific Notes

Convex stores:
- All database documents (`users`, `cards`, `workspaces`, etc.)
- All uploaded files (via `ctx.storage`)
- Deployment history (automatic rollback capability)

Convex support: https://docs.convex.dev/support
