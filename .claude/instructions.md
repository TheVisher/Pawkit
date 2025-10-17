# Claude Code Instructions for Pawkit Project

## 🚨 CRITICAL: DATABASE SAFETY RULES

**THIS PROJECT HAS EXPERIENCED CATASTROPHIC DATA LOSS IN THE PAST.**

All users lost their data when the production database was accidentally reset. These rules are **NON-NEGOTIABLE**.

---

## ⛔ ABSOLUTELY FORBIDDEN - NEVER DO THESE:

### 1. NEVER run these commands:
```bash
npx prisma migrate reset
npx prisma db push --force-reset
npx prisma migrate reset --force
npm run prisma:reset
npm run prisma:push:force
```

### 2. NEVER suggest or run:
- Any command containing `--force-reset`
- Any command containing `--force` with database operations
- Direct SQL commands like `DROP TABLE`, `TRUNCATE`, `DELETE FROM` without WHERE
- Deleting files from `prisma/migrations/` directory
- Modifying `scripts/protect-production-db.js` or `scripts/pre-migration-check.js`

### 3. NEVER set environment variables:
- `ALLOW_PRODUCTION_MIGRATION=true` (unless user explicitly instructs you to)
- `ALLOW_PRODUCTION_RESET=true`
- Any variable that bypasses safety checks

---

## ✅ REQUIRED BEFORE ANY DATABASE OPERATION:

### Step 1: Read SAFETY.md
Before ANY database-related command, you MUST read and follow [SAFETY.md](../SAFETY.md).

### Step 2: Check Environment
```bash
# Check what database we're using
grep DATABASE_URL .env.local 2>/dev/null || echo "No .env.local found"
```

**If DATABASE_URL contains ANY of these, it's PRODUCTION:**
- `supabase.co`
- `aws.rds.amazonaws.com`
- `render.com`
- `railway.app`
- `planetscale.com`
- `neon.tech`

### Step 3: Get User Permission
ALWAYS ask the user before:
- Creating migrations
- Pushing schema changes
- Running any database command
- Modifying the database schema

### Step 4: Recommend Backup
For local changes:
```bash
npm run prisma:backup
```

For production: Remind user to backup in Supabase dashboard.

---

## ✅ SAFE COMMANDS YOU CAN USE:

```bash
# Always safe:
npm run prisma:generate    # Only generates client code
npm run prisma:backup      # Creates backup
npm run prisma:studio      # Opens database viewer (read-only)

# Safe with protection (will check environment):
npm run prisma:migrate     # Protected by pre-migration-check.js
npm run prisma:push        # Protected (no --force-reset)
npm run build              # Protected (runs pre-migration-check.js)

# For viewing data:
npx prisma studio          # Safe, read-only
```

---

## 📝 SAFE WORKFLOW FOR SCHEMA CHANGES:

### For Local Development:
```bash
# 1. User requests a schema change

# 2. You ask: "I'll need to modify the database schema. Should I proceed?"

# 3. User confirms

# 4. You suggest: "I recommend backing up first: npm run prisma:backup"

# 5. Make changes to prisma/schema.prisma

# 6. Run: npm run prisma:migrate
#    This is protected by pre-migration-check.js

# 7. Verify with: npm run prisma:studio
```

### For Production:
```bash
# 1. Tell user: "This will affect production. You should:"
#    - Backup in Supabase dashboard first
#    - Test the migration locally
#    - Commit and let Vercel auto-deploy

# 2. Test locally first: npm run prisma:migrate

# 3. Commit migration files: git add prisma/migrations/

# 4. Push to repo - Vercel will deploy safely with: prisma migrate deploy
```

---

## 🎯 DECISION TREE FOR DATABASE OPERATIONS:

```
User asks for database change
    ↓
Read SAFETY.md
    ↓
Check DATABASE_URL - Is it production?
    ↓
├─ YES (contains supabase.co, etc.)
│   ↓
│   STOP and tell user:
│   "This would affect PRODUCTION. I cannot do this directly."
│   "Please: 1) Backup in Supabase 2) Test locally 3) Deploy via git"
│   ↓
│   Do NOT proceed without explicit override instruction
│
└─ NO (file:./dev.db or localhost)
    ↓
    Ask user: "I'll modify the local database schema. Proceed?"
    ↓
    Suggest: "Recommend: npm run prisma:backup first"
    ↓
    Wait for confirmation
    ↓
    Use ONLY npm run scripts (protected)
    ↓
    Verify the change worked
```

---

## 🔍 HOW TO DETECT WHAT DATABASE YOU're USING:

```bash
# Method 1: Check .env.local
cat .env.local | grep DATABASE_URL

# Method 2: Check what's in use
node -e "console.log(process.env.DATABASE_URL || 'Not set')"

# Local database indicators:
# - file:./dev.db
# - localhost
# - 127.0.0.1

# Production database indicators:
# - supabase.co
# - Any cloud provider domain
# - postgres:// with remote host
```

---

## 🛡️ PROTECTION SYSTEMS IN PLACE:

This project has multiple layers of protection:

1. **[scripts/protect-production-db.js](../scripts/protect-production-db.js)**
   - Detects production databases
   - Blocks dangerous commands
   - Requires explicit bypass flag

2. **[scripts/pre-migration-check.js](../scripts/pre-migration-check.js)**
   - Runs before all migrations
   - Checks environment
   - Warns about production operations

3. **Protected npm scripts in [package.json](../package.json)**
   - All dangerous commands are blocked
   - Safe commands route through protection scripts

4. **[SAFETY.md](../SAFETY.md)**
   - Complete safety documentation
   - Recovery procedures
   - Best practices

---

## 🚨 IF USER REPORTS DATA LOSS:

1. **STOP immediately** - don't run any more commands
2. **Check for backups**:
   ```bash
   ls -lht backups/ | head -10
   ```
3. **Tell user**: "Check Supabase dashboard → Database → Backups"
4. **Read SAFETY.md** section "WHAT TO DO IF DATA LOSS HAPPENS"
5. **Guide user through recovery** - don't try to fix it yourself

---

## 💡 EXAMPLES:

### ❌ WRONG:
```
User: "Add a new field to the User model"
Claude: "I'll add that and run npx prisma db push --force-reset"
```
**Why wrong:** Never use --force-reset, and didn't check environment!

### ✅ RIGHT:
```
User: "Add a new field to the User model"
Claude: "I'll add a field to the User model in the Prisma schema.
This will require a database migration. Should I proceed?

I recommend backing up first: npm run prisma:backup"

User: "Yes"
Claude: "I'll update prisma/schema.prisma and run npm run prisma:migrate"
[Updates schema.prisma]
[Runs npm run prisma:migrate - which is protected]
```

### ❌ WRONG:
```
User: "Something's wrong with the database"
Claude: "Let me reset it: npx prisma migrate reset"
```
**Why wrong:** NEVER suggest reset! Didn't check environment!

### ✅ RIGHT:
```
User: "Something's wrong with the database"
Claude: "Let me check what's happening first. What error are you seeing?
I'll open Prisma Studio to inspect the data: npm run prisma:studio"
[Investigates the actual problem]
[Suggests targeted fix, not nuclear option]
```

---

## 🎓 REMEMBER:

1. **Read [SAFETY.md](../SAFETY.md) before ANY database command**
2. **Check environment - is it production?**
3. **Ask user permission first**
4. **Recommend backups**
5. **Use npm scripts, not direct npx commands**
6. **Never use --force-reset or reset commands**
7. **When in doubt, ask the user**

---

## 📞 IF YOU'RE UNSURE:

**ASK THE USER.** It's better to ask than to cause data loss.

Examples:
- "I'm not sure if this database is production. Can you confirm?"
- "This operation could affect data. Should I create a backup first?"
- "I want to run X, but I should check with you first because it modifies the database."

---

**USER DATA IS IRREPLACEABLE. BE CAUTIOUS, NOT FAST.**

This project's users have already lost data once. It must never happen again.
