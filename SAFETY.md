# 🚨 CRITICAL DATABASE SAFETY RULES

## ⛔ ABSOLUTELY FORBIDDEN COMMANDS - NEVER RUN THESE:

### Production Database (Supabase PostgreSQL):
**These commands will DELETE ALL USER DATA in production:**

```bash
# NEVER RUN THESE - THEY ARE NOW BLOCKED BY SAFETY SCRIPTS:
npx prisma migrate reset
npx prisma db push --force-reset
npx prisma migrate reset --force
npm run prisma:reset
npm run prisma:push:force

# ANY Prisma command with these flags:
--force-reset
--force
--skip-generate (without checking environment)
```

### How to Identify Production Database:
- URL contains: `supabase.co`, `aws.rds.amazonaws.com`, `render.com`, etc.
- Environment: `NODE_ENV=production`
- Database URL does NOT contain: `localhost`, `127.0.0.1`, `file:`, `dev.db`

## 🛡️ SAFETY SYSTEMS NOW IN PLACE:

### 1. Automatic Protection Scripts
All dangerous commands now run through protection scripts that:
- ✅ Detect production databases automatically
- ✅ Block destructive operations on production
- ✅ Require explicit `ALLOW_PRODUCTION_MIGRATION=true` flag
- ✅ Create automatic backups before migrations
- ✅ Validate environment before any database operation

### 2. Protected npm Scripts
Safe scripts you CAN use:
```bash
npm run prisma:migrate      # Protected: Won't run on production without approval
npm run prisma:push         # Protected: Safe schema sync only
npm run prisma:generate     # Always safe
npm run prisma:backup       # Always safe - creates local backup
npm run db:backup           # Alias for backup
```

Blocked scripts:
```bash
npm run prisma:reset        # ❌ BLOCKED - Exits with error
npm run prisma:reset:local  # ❌ BLOCKED - Requires manual command
npm run prisma:push:force   # ❌ BLOCKED - Too dangerous
```

## ✅ SAFE WORKFLOW FOR DATABASE CHANGES:

### For Local Development (SQLite):
```bash
# 1. Backup first (optional but recommended)
npm run prisma:backup

# 2. Make schema changes in prisma/schema.prisma

# 3. Create migration (safe - protected)
npm run prisma:migrate

# 4. Verify changes
npm run prisma:studio
```

### For Production Migrations:
```bash
# 1. BACKUP IN SUPABASE DASHBOARD FIRST!
#    https://supabase.com/dashboard/project/_/database/backups

# 2. Test migration locally first
npm run prisma:migrate

# 3. Review migration files in prisma/migrations/

# 4. Commit migration files to git

# 5. Push to repository - Vercel will auto-deploy

# 6. The build script automatically runs: prisma migrate deploy
#    This is SAFE - it only applies new migrations, never destructive
```

### Emergency Production Migration:
**Only if you must run migrations manually on production:**

```bash
# 1. Create backup in Supabase dashboard
# 2. Download backup locally
# 3. Set temporary environment variable
export ALLOW_PRODUCTION_MIGRATION=true
# 4. Run migration
npm run prisma:migrate:deploy
# 5. Immediately unset the flag
unset ALLOW_PRODUCTION_MIGRATION
```

## 📋 AI ASSISTANT CHECKLIST:

Before running ANY database command, AI assistants MUST:

- [ ] **IDENTIFY ENVIRONMENT**: Check if DATABASE_URL contains production indicators
- [ ] **NEVER RUN DESTRUCTIVE COMMANDS**: No `reset`, `--force-reset`, `DROP TABLE`, etc.
- [ ] **USE SAFE SCRIPTS ONLY**: Use npm scripts, not direct prisma commands
- [ ] **ASK FIRST**: Get explicit user permission for schema changes
- [ ] **EXPLAIN RISKS**: Tell user what will happen and what could go wrong
- [ ] **SUGGEST BACKUP**: Always recommend `npm run prisma:backup` first
- [ ] **VERIFY ENVIRONMENT**: Double-check we're not on production
- [ ] **READ PROTECTION SCRIPTS**: Check if safety scripts will allow the command

### For Claude Code Specifically:

**YOU MUST NEVER:**
1. Run `npx prisma migrate reset` - BLOCKED
2. Run `npx prisma db push --force-reset` - BLOCKED
3. Suggest destructive SQL like `DROP TABLE` or `TRUNCATE`
4. Modify the protection scripts without user approval
5. Set `ALLOW_PRODUCTION_MIGRATION=true` without explicit instruction
6. Delete migration files from `prisma/migrations/`
7. Run database operations without checking protection scripts first

**YOU MUST ALWAYS:**
1. Use `npm run` scripts instead of direct `npx prisma` commands
2. Ask user permission before ANY database schema change
3. Recommend backing up first: `npm run prisma:backup`
4. Explain what each command will do
5. Check if DATABASE_URL is production before suggesting commands
6. Suggest testing changes locally before production
7. Remind user about Supabase backups for production

## 🚨 WHAT TO DO IF DATA LOSS HAPPENS:

### Immediate Actions:
1. **STOP** - Don't run any more commands
2. **Check Backups**:
   - Local: `./backups/` directory
   - Production: Supabase dashboard backups
3. **Check Database Journal**: `prisma/dev.db-journal` (SQLite only)
4. **Check Git History**: Look for any data exports/dumps

### Recovery Steps:

#### Local Database (SQLite):
```bash
# Restore from most recent backup
cd backups
ls -lt | head -5  # List recent backups
cp backup_TIMESTAMP.db ../prisma/dev.db
```

#### Production Database (Supabase):
1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Select most recent backup
4. Click "Restore" (this will restore the entire database)
5. Verify data is back

### Prevention for Next Time:
- ✅ Protection scripts are now in place
- ✅ All dangerous commands are blocked
- ✅ Automatic backups before migrations
- ✅ Environment detection enabled
- ✅ Manual confirmation required for production

## 🔐 SECURITY NOTES:

1. **Never commit** `.env` files with real credentials
2. **Never share** production DATABASE_URL publicly
3. **Always use** environment variables for sensitive data
4. **Rotate credentials** if they're exposed
5. **Use separate databases** for dev/staging/production
6. **Enable Point-in-Time Recovery** in Supabase for production

## 📚 ADDITIONAL RESOURCES:

- Prisma Docs: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Supabase Backups: https://supabase.com/docs/guides/platform/backups
- Protection Scripts: `scripts/protect-production-db.js`, `scripts/pre-migration-check.js`

---

## 🎯 SUMMARY FOR AI ASSISTANTS:

**Golden Rule: When in doubt, DON'T run the command. Ask the user first.**

The safety scripts will now catch most dangerous operations, but you should:
1. Always use `npm run` scripts (protected)
2. Never use direct `npx prisma` commands for destructive operations
3. Always check environment before suggesting database commands
4. Always recommend backups first
5. Always explain what will happen

**REMEMBER: User data is IRREPLACEABLE. Be overly cautious, not fast.**
