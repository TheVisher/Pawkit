# Pawkit V2 Safety Guardrails

**Purpose**: CRITICAL rules for Claude Code to prevent catastrophic mistakes

**Created**: December 20, 2025

**WARNING**: The user has previously lost their ENTIRE DATABASE due to Claude Code running destructive commands overnight. This skill exists to PREVENT that from ever happening again.

---

## ABSOLUTE DATABASE PROTECTION

### NEVER RUN THESE COMMANDS - NO EXCEPTIONS

```bash
# ABSOLUTELY FORBIDDEN - These have destroyed user data before
prisma migrate reset
npx prisma migrate reset
pnpm prisma migrate reset
prisma db push --force-reset
prisma migrate reset --force

# ABSOLUTELY FORBIDDEN - Direct database destruction
DROP TABLE
DROP DATABASE
TRUNCATE
DELETE FROM "User"
DELETE FROM "Card"
DELETE FROM "Collection"
DELETE FROM "Workspace"
DELETE FROM "CalendarEvent"
DELETE FROM "Todo"

# ABSOLUTELY FORBIDDEN - Supabase destruction
supabase db reset
supabase db push --force
```

### NEVER USE deleteMany() WITHOUT USER PRESENT

```typescript
// FORBIDDEN - Mass deletion
await prisma.card.deleteMany()
await prisma.user.deleteMany()
await prisma.collection.deleteMany()
await db.cards.clear()
await db.collections.clear()

// FORBIDDEN - Even with "filters" that match everything
await prisma.card.deleteMany({ where: {} })
await prisma.card.deleteMany({ where: { deleted: true } })  // Still dangerous!
```

### NEVER MODIFY PRODUCTION DATABASE

- I do NOT have permission to run migrations on production
- I do NOT have permission to delete production data
- I do NOT have permission to "clean up" or "reset" anything
- If I think something needs to be deleted, I MUST ASK FIRST

### THE OVERNIGHT RULE

**When running autonomously (user not actively watching):**
- I will NOT run any database commands
- I will NOT run any prisma commands except `prisma generate`
- I will NOT attempt to "fix" database issues
- I will NOT "clean up" data
- I will STOP and wait for user input if database changes seem needed

---

## NEVER DO THESE THINGS

### Database Destruction

**NEVER run these commands:**
```bash
# FORBIDDEN - Database drops
DROP TABLE ...
DROP DATABASE ...
prisma migrate reset
prisma db push --force-reset
npx prisma migrate reset

# FORBIDDEN - Mass deletions
DELETE FROM ... (without WHERE clause)
TRUNCATE TABLE ...

# FORBIDDEN - Destructive Supabase operations
supabase db reset
```

**NEVER write code that:**
- Deletes all records from a table
- Drops columns containing user data without migration
- Runs `deleteMany()` without explicit filters
- Bypasses soft-delete patterns

---

### Git Destruction

**NEVER run these commands:**
```bash
# FORBIDDEN - History destruction
git push --force origin main
git push -f origin main
git reset --hard origin/main  (if local has unpushed work)
git clean -fdx  (without explicit user approval)

# FORBIDDEN - Branch destruction
git branch -D main
git push origin --delete main
```

**ALWAYS:**
- Create feature branches for changes
- Never force push to main/master
- Ask before any `--force` operation

---

### File Destruction

**NEVER delete these without explicit request:**
```
.env
.env.local
.env.production
prisma/schema.prisma
prisma/migrations/
package.json
package-lock.json / pnpm-lock.yaml
next.config.js
tsconfig.json
```

**NEVER run:**
```bash
rm -rf /
rm -rf ~
rm -rf .
rm -rf node_modules  (without user knowing)
rm -rf .git
rm -rf prisma/migrations
```

---

### Secret Exposure

**NEVER:**
- Echo or print environment variables containing secrets
- Commit `.env` files
- Log API keys, tokens, or passwords
- Include real credentials in code examples
- Output `SUPABASE_SERVICE_ROLE_KEY` or similar

**ALWAYS:**
- Use placeholder values in examples: `sk_test_xxx`, `your-api-key-here`
- Check for `.env` in `.gitignore` before committing

---

### Production Safety

**NEVER:**
- Run migrations on production without explicit approval
- Deploy to production without user confirmation
- Modify production database directly
- Execute `npx prisma db push` against production

**ALWAYS:**
- Confirm environment before destructive operations
- Default to development/local operations
- Ask "Is this production or development?" if unclear

---

## ALWAYS DO THESE THINGS

### Before Destructive Operations

1. **Confirm with user** before any delete/drop/reset
2. **Check the environment** - dev vs prod
3. **Create backups** when possible
4. **Use soft deletes** - set `deleted: true`, not actual deletion

### When Modifying Database Schema

1. **Use migrations** - never `db push` for schema changes
2. **Add columns as nullable first** - then backfill, then make required
3. **Never drop columns with data** - deprecate first
4. **Test migrations on dev** before production

### When Working with Git

1. **Always work on feature branches**
2. **Never force push to shared branches**
3. **Confirm before pushing to main**
4. **Use `--no-verify` only when explicitly requested**

---

## SAFE ALTERNATIVES

| Dangerous | Safe Alternative |
|-----------|------------------|
| `DELETE FROM cards` | `UPDATE cards SET deleted = true` |
| `DROP TABLE cards` | Create migration to archive first |
| `git push --force` | `git push --force-with-lease` (and ask first) |
| `rm -rf migrations/` | Ask user, explain consequences |
| `prisma migrate reset` | `prisma migrate dev` for new migrations |
| Hard delete records | Soft delete with `deleted` flag |

---

## CONFIRMATION REQUIRED

Before executing any of these, I MUST ask the user:

1. **"Are you sure you want to delete [X]?"** - For any deletion
2. **"This will affect production. Proceed?"** - For production operations
3. **"This cannot be undone. Continue?"** - For irreversible actions
4. **"Should I create a backup first?"** - Before destructive changes

---

## IF I MAKE A MISTAKE

If I accidentally run a destructive command:

1. **STOP immediately**
2. **Tell the user what happened**
3. **Suggest recovery steps** (git reflog, backups, etc.)
4. **Do NOT try to "fix" it with more destructive commands**

---

## PAWKIT-SPECIFIC RULES

### Supabase
- Never expose `SUPABASE_SERVICE_ROLE_KEY`
- Never run direct SQL that bypasses RLS
- Always use Prisma for database operations

### User Data
- All user data uses soft delete (`deleted: true`)
- Never permanently delete user content
- Workspace isolation must be maintained

### Extension Tokens
- Never log or output extension tokens
- Tokens are bcrypt hashed before storage
- Plain tokens shown to user only once during generation

---

---

## WHAT TO DO INSTEAD

### If I think the database needs to be reset:
**STOP. Ask the user.** Never reset. There's almost always another way.

### If I think data needs to be deleted:
**Use soft delete:** `UPDATE ... SET deleted = true, deletedAt = NOW()`
**Never hard delete user data.**

### If a migration seems stuck or broken:
**Ask the user.** Do NOT try to fix it with reset commands.
Suggest: "The migration seems stuck. Can you check Supabase dashboard?"

### If I'm running overnight/autonomously and hit a database issue:
**STOP IMMEDIATELY.** Write a note about what happened and wait for user.
Do NOT try to "fix" the database.

### If tests need a clean database:
**Use test fixtures and transactions**, not database resets.
**Never touch the real database for tests.**

---

## EMERGENCY STOP CONDITIONS

If I find myself about to run ANY of these, I MUST STOP:
- Any command with `reset` in it
- Any command with `--force` related to database
- Any `DELETE FROM` on a main table
- Any `deleteMany()` call
- Any `TRUNCATE` or `DROP`
- Any Supabase CLI command that modifies data

**The user lost their entire database once. I will not let that happen again.**

---

**This skill exists to protect your data. I will follow these rules.**
