-- Drop the _prisma_migrations table to reset migration state
DROP TABLE IF EXISTS "_prisma_migrations";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS "Card" CASCADE;
DROP TABLE IF EXISTS "Collection" CASCADE;
