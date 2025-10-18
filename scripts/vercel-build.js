#!/usr/bin/env node

/**
 * Vercel Build Script
 *
 * Runs during Vercel deployments. This script:
 * 1. Checks if we're deploying to production
 * 2. Runs migrations if ALLOW_PRODUCTION_MIGRATION=true OR if migrations are safe
 * 3. Builds the Next.js app
 *
 * Note: prisma migrate deploy is idempotent - it only applies missing migrations
 */

const { execSync } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL || '';
const isProduction = DATABASE_URL.includes('supabase.co');

console.log('\n🚀 Vercel Build Script\n');

if (isProduction) {
  console.log('📊 Production database detected');

  if (process.env.ALLOW_PRODUCTION_MIGRATION === 'true') {
    console.log('✅ ALLOW_PRODUCTION_MIGRATION=true, running migrations...\n');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('⚠️  ALLOW_PRODUCTION_MIGRATION not set');
    console.log('   Skipping migrations (prisma generate will still run)');
    console.log('   If you need to run migrations, set ALLOW_PRODUCTION_MIGRATION=true\n');
  }
} else {
  console.log('📊 Non-production database, running migrations...\n');
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

console.log('\n📦 Building Next.js app...\n');
try {
  execSync('next build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('\n✅ Build complete!\n');
