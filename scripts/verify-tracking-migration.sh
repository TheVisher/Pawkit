#!/bin/bash
# Verify that the never-opened tracking migration has been applied correctly

set -e

echo "🔍 Verifying Never Opened Tracking Migration..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo ""
  echo "Set it with:"
  echo "  export DATABASE_URL='your-database-connection-string'"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Check if columns exist in database
echo "📊 Checking database columns..."

QUERY="SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Card'
AND column_name IN ('lastOpenedAt', 'openCount', 'lastAccessType')
ORDER BY column_name;"

RESULT=$(npx prisma db execute --stdin <<< "$QUERY" 2>&1)

if echo "$RESULT" | grep -q "lastOpenedAt"; then
  echo "✅ lastOpenedAt column exists"
else
  echo "❌ lastOpenedAt column NOT FOUND"
  echo ""
  echo "Run migration with:"
  echo "  npx prisma migrate deploy"
  exit 1
fi

if echo "$RESULT" | grep -q "openCount"; then
  echo "✅ openCount column exists"
else
  echo "❌ openCount column NOT FOUND"
  exit 1
fi

if echo "$RESULT" | grep -q "lastAccessType"; then
  echo "✅ lastAccessType column exists"
else
  echo "❌ lastAccessType column NOT FOUND"
  exit 1
fi

echo ""
echo "📑 Checking index..."

INDEX_QUERY="SELECT indexname
FROM pg_indexes
WHERE tablename = 'Card'
AND indexname = 'Card_userId_lastOpenedAt_idx';"

INDEX_RESULT=$(npx prisma db execute --stdin <<< "$INDEX_QUERY" 2>&1)

if echo "$INDEX_RESULT" | grep -q "Card_userId_lastOpenedAt_idx"; then
  echo "✅ Index Card_userId_lastOpenedAt_idx exists"
else
  echo "❌ Index Card_userId_lastOpenedAt_idx NOT FOUND"
  exit 1
fi

echo ""
echo "🎉 SUCCESS! All tracking fields and indexes are present."
echo ""
echo "Column Details:"
echo "$RESULT"
echo ""
echo "Next steps:"
echo "1. Deploy the application code to Vercel"
echo "2. Test the /api/cards/[id]/track-open endpoint"
echo "3. Verify Daily Dig widget appears on home page"
echo "4. Check Rediscover sidebar item has badge counter"
