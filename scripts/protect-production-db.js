#!/usr/bin/env node

/**
 * Production Database Protection Script
 *
 * This script prevents accidental destructive database operations on production.
 * It checks the DATABASE_URL and blocks dangerous commands if pointed at production.
 */

const DATABASE_URL = process.env.DATABASE_URL || '';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Detect if this is a production database
const isProductionDB = () => {
  if (!DATABASE_URL) {
    console.log('⚠️  No DATABASE_URL found');
    return false;
  }

  // Check for production indicators
  const productionIndicators = [
    'supabase.co',
    'aws.rds.amazonaws.com',
    'digitalocean.com',
    'render.com',
    'railway.app',
    'planetscale.com',
    'neon.tech',
    '.prod.',
    'production'
  ];

  return productionIndicators.some(indicator =>
    DATABASE_URL.toLowerCase().includes(indicator.toLowerCase())
  );
};

// Check if DATABASE_URL is pointing to localhost/local file
const isLocalDB = () => {
  if (!DATABASE_URL) return false;

  const localIndicators = [
    'localhost',
    '127.0.0.1',
    'file:',
    'dev.db',
    'local.db',
    'test.db'
  ];

  return localIndicators.some(indicator =>
    DATABASE_URL.toLowerCase().includes(indicator.toLowerCase())
  );
};

const command = process.argv[2] || '';

// List of dangerous commands
const dangerousCommands = [
  'reset',
  'push --force-reset',
  'db push --force-reset',
  'migrate reset',
  'db reset'
];

const isDangerousCommand = dangerousCommands.some(cmd =>
  command.toLowerCase().includes(cmd)
);

// Main protection logic
if (isDangerousCommand) {
  console.log('\n🚨 DANGEROUS DATABASE COMMAND DETECTED 🚨\n');
  console.log(`Command: ${command}\n`);

  if (isProductionDB()) {
    console.error('❌ BLOCKED: This command would affect a PRODUCTION database!');
    console.error(`   Database: ${DATABASE_URL.substring(0, 50)}...`);
    console.error('\n🛡️  Protection active: Cannot run destructive commands on production.');
    console.error('\nIf you REALLY need to do this:');
    console.error('  1. Create a manual backup first');
    console.error('  2. Run the command directly with: npx prisma [command]');
    console.error('  3. Add ALLOW_PRODUCTION_RESET=true to bypass (NOT RECOMMENDED)');
    console.error('\n⚠️  YOU WILL LOSE ALL USER DATA! ⚠️\n');
    process.exit(1);
  }

  if (!isLocalDB() && !DATABASE_URL.includes('file:')) {
    console.error('⚠️  WARNING: DATABASE_URL does not appear to be local!');
    console.error(`   Database: ${DATABASE_URL.substring(0, 50)}...`);
    console.error('\nThis might be a production or staging database.');
    console.error('Aborting to be safe.\n');
    process.exit(1);
  }

  console.log('⚠️  WARNING: This will DELETE ALL DATA in your local database!');
  console.log(`   Database: ${DATABASE_URL}`);
  console.log('\nIf this is correct, run the command directly:');
  console.log(`   npx prisma ${command}\n`);
  process.exit(1);
}

// If we get here, command is safe
console.log('✅ Database command safety check passed');
process.exit(0);
