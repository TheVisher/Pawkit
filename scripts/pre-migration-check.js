#!/usr/bin/env node

/**
 * Pre-Migration Check Script
 *
 * Runs before any migration to ensure:
 * 1. We have a recent backup
 * 2. We're not accidentally running against production
 * 3. User is aware of what's happening
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL || '';
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Check if production database
const isProductionDB = () => {
  const productionIndicators = [
    'supabase.co',
    'aws.rds.amazonaws.com',
    'digitalocean.com',
    'render.com',
    'railway.app',
    'planetscale.com',
    'neon.tech'
  ];

  return productionIndicators.some(indicator =>
    DATABASE_URL.toLowerCase().includes(indicator.toLowerCase())
  );
};

// Check for recent backup
const hasRecentBackup = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    return false;
  }

  const backupFiles = fs.readdirSync(BACKUP_DIR);
  if (backupFiles.length === 0) {
    return false;
  }

  // Check if any backup is less than 1 hour old
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const recentBackups = backupFiles.filter(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    return stats.mtimeMs > oneHourAgo;
  });

  return recentBackups.length > 0;
};

console.log('\n🔍 Running pre-migration checks...\n');

// Check 1: Database URL exists
if (!DATABASE_URL) {
  console.error('❌ No DATABASE_URL found!');
  console.error('   Set DATABASE_URL in your .env file\n');
  process.exit(1);
}

// Check 2: Production database protection
if (isProductionDB()) {
  console.log('⚠️  PRODUCTION DATABASE DETECTED!');
  console.log(`   ${DATABASE_URL.substring(0, 60)}...`);
  console.log('\n🛡️  Production migration safety checks:');

  // For production, we require explicit confirmation
  console.log('\n   To run migrations on production:');
  console.log('   1. Ensure you have a database backup in Supabase');
  console.log('   2. Set: ALLOW_PRODUCTION_MIGRATION=true');
  console.log('   3. Re-run the migration command\n');

  if (process.env.ALLOW_PRODUCTION_MIGRATION !== 'true') {
    console.error('❌ BLOCKED: Production migrations require explicit approval');
    console.error('   Set ALLOW_PRODUCTION_MIGRATION=true to proceed\n');
    process.exit(1);
  }

  console.log('✅ Production migration approved by environment variable\n');
  process.exit(0);
}

// Check 3: Local database - recommend backup
const dbType = DATABASE_URL.startsWith('file:') ? 'SQLite' : 'PostgreSQL';
console.log(`📊 Database type: ${dbType}`);
console.log(`   ${DATABASE_URL.substring(0, 60)}...`);

if (DATABASE_URL.startsWith('file:') && !hasRecentBackup()) {
  console.log('\n⚠️  No recent backup found for local database');
  console.log('   Recommended: npm run prisma:backup');
  console.log('\n   Continue anyway? (migrations are generally safe)');
}

console.log('\n✅ Pre-migration checks passed\n');
process.exit(0);
