# Database Operations - Quick Reference

## 🚀 Common Tasks

### Making Schema Changes (Local Development)

```bash
# 1. Backup (recommended)
npm run prisma:backup

# 2. Edit schema
# Edit prisma/schema.prisma

# 3. Create migration
npm run prisma:migrate
# Give it a name when prompted

# 4. Verify
npm run prisma:studio
```

### Viewing Your Data

```bash
# Open Prisma Studio (database viewer)
npm run prisma:studio
# Opens at http://localhost:5555
```

### Deploying Schema Changes to Production

```bash
# 1. Backup in Supabase dashboard first!
#    https://supabase.com/dashboard/project/_/database/backups

# 2. Test locally
npm run prisma:migrate

# 3. Commit and push
git add prisma/migrations/
git commit -m "Add new migration"
git push

# Vercel automatically deploys and runs migrations safely
```

### Creating a Backup

```bash
# Local database backup
npm run prisma:backup
# Saves to: backups/backup_TIMESTAMP.db

# Production database
# Use Supabase dashboard → Database → Backups
```

---

## ⚠️ Emergency: Need to Reset Local Database?

**This deletes ALL local data!**

```bash
# 1. Backup first!
npm run prisma:backup

# 2. Run manually (intentionally not a script)
npx prisma migrate reset

# 3. Seed if needed
# Add your seed script here
```

---

## 🚫 Commands That Are Blocked

These will fail with error messages:

```bash
npm run prisma:reset              # BLOCKED
npm run prisma:reset:local        # BLOCKED
npm run prisma:push:force         # BLOCKED
```

---

## ✅ Safe Commands (Always Work)

```bash
npm run prisma:generate    # Generate Prisma client
npm run prisma:studio      # View database
npm run prisma:backup      # Create backup
npm run dev                # Start dev server
npm run build              # Build (with protection)
```

---

## 🆘 If Something Goes Wrong

### "I accidentally modified the schema"
```bash
# Restore schema from git
git checkout prisma/schema.prisma
npm run prisma:generate
```

### "Migration failed"
```bash
# Check error message
# Usually fixed by:
npm run prisma:generate
# Or restore from backup if needed
```

### "Lost local data"
```bash
# Restore from backup
cd backups
ls -lt | head -5  # Find recent backup
cp backup_YYYYMMDD_HHMMSS.db ../prisma/dev.db
cd ..
npm run dev
```

### "Production database issues"
```bash
# DO NOT try to fix it yourself
# Contact your team
# Use Supabase dashboard to restore from backup
```

---

## 📚 Full Documentation

- [SAFETY.md](SAFETY.md) - Complete safety rules
- [DATABASE_PROTECTION_SUMMARY.md](DATABASE_PROTECTION_SUMMARY.md) - How protection works
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [.claude/instructions.md](.claude/instructions.md) - AI assistant rules

---

## 🎯 Decision Tree

```
Need to change database schema?
    ↓
Is it production?
    ├─ YES → Test locally first → Commit → Push → Vercel deploys
    └─ NO → npm run prisma:backup → Edit schema → npm run prisma:migrate

Lost data?
    ↓
Is it production?
    ├─ YES → Restore from Supabase dashboard backups
    └─ NO → Restore from backups/ directory

Need to see data?
    ↓
npm run prisma:studio
```

---

## 💡 Tips

1. **Always backup before migrations** (local dev)
2. **Test locally before deploying** to production
3. **Use Supabase backups** for production
4. **Never use `--force-reset`** flags
5. **Commit migrations to git** - they're part of your code
6. **Use npm scripts** - they have protection built-in
7. **When in doubt, ask** - don't guess with database operations

---

## 🔐 Environment Variables

```bash
# Local development (.env.local)
DATABASE_URL="file:./dev.db"

# Production (Vercel environment variables)
DATABASE_URL="postgresql://user:pass@db.supabase.co:5432/postgres"
ALLOW_PRODUCTION_MIGRATION=false  # Only true when needed temporarily
```

---

## 📞 Quick Help

- Supabase Dashboard: https://supabase.com/dashboard
- Prisma Docs: https://www.prisma.io/docs
- Backups location: `./backups/`
- Protection scripts: `./scripts/`
