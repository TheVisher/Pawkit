#!/bin/bash

# Automated Backup Script
# Runs before migrations to ensure we always have a recovery point

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set, skipping backup"
    exit 0
fi

# Only backup local SQLite databases automatically
if [[ "$DATABASE_URL" == file:* ]]; then
    DB_FILE=$(echo "$DATABASE_URL" | sed 's/file://')
    DB_PATH="$PROJECT_ROOT/prisma/$DB_FILE"

    if [ -f "$DB_PATH" ]; then
        BACKUP_FILE="$BACKUP_DIR/auto_backup_$TIMESTAMP.db"
        cp "$DB_PATH" "$BACKUP_FILE"
        echo "✅ Automatic backup created: $BACKUP_FILE"

        # Keep only last 10 auto backups
        cd "$BACKUP_DIR"
        ls -t auto_backup_*.db 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
        echo "   (Keeping last 10 automatic backups)"
    else
        echo "⚠️  Database file not found: $DB_PATH"
    fi
else
    echo "ℹ️  Not a local database - backup manually or use Supabase backups"
    echo "   For production: https://supabase.com/dashboard/project/_/database/backups"
fi
