#!/bin/bash
# Setup automatic database backups

# Create backup directory
mkdir -p backups

# Create a cron job for daily backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && ./scripts/backup-db.sh") | crontab -

echo "✅ Automatic daily backups configured"
echo "📁 Backups will be stored in: $(pwd)/backups/"
echo "⏰ Backup time: Daily at 2:00 AM"
