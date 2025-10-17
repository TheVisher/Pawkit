#!/bin/bash
# Database backup script
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dev_$DATE.db"

mkdir -p "$BACKUP_DIR"
cp prisma/dev.db "$BACKUP_FILE"
echo "Database backed up to: $BACKUP_FILE"

# Keep only last 10 backups
ls -t $BACKUP_DIR/dev_*.db | tail -n +11 | xargs -r rm
