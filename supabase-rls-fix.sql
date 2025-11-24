-- Complete RLS Setup for Pawkit Mobile App
-- Run this entire script in Supabase SQL Editor

-- First, drop existing policies if any (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Users can view their own cards" ON "Card";
DROP POLICY IF EXISTS "Users can insert their own cards" ON "Card";
DROP POLICY IF EXISTS "Users can update their own cards" ON "Card";
DROP POLICY IF EXISTS "Users can delete their own cards" ON "Card";
DROP POLICY IF EXISTS "Users can view their own collections" ON "Collection";
DROP POLICY IF EXISTS "Users can insert their own collections" ON "Collection";
DROP POLICY IF EXISTS "Users can update their own collections" ON "Collection";
DROP POLICY IF EXISTS "Users can delete their own collections" ON "Collection";
DROP POLICY IF EXISTS "Users can view their own user record" ON "User";
DROP POLICY IF EXISTS "Users can update their own user record" ON "User";
DROP POLICY IF EXISTS "Users can insert their own user record" ON "User";

-- Enable RLS on tables
ALTER TABLE "Card" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Collection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON "Card" TO authenticated;
GRANT ALL ON "Collection" TO authenticated;
GRANT ALL ON "User" TO authenticated;

-- Also grant on sequences (for auto-incrementing IDs if you have any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Card Policies
CREATE POLICY "Users can view their own cards"
ON "Card"
FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert their own cards"
ON "Card"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own cards"
ON "Card"
FOR UPDATE
TO authenticated
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own cards"
ON "Card"
FOR DELETE
TO authenticated
USING (auth.uid()::text = "userId");

-- Collection Policies
CREATE POLICY "Users can view their own collections"
ON "Collection"
FOR SELECT
TO authenticated
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert their own collections"
ON "Collection"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own collections"
ON "Collection"
FOR UPDATE
TO authenticated
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own collections"
ON "Collection"
FOR DELETE
TO authenticated
USING (auth.uid()::text = "userId");

-- User Policies
CREATE POLICY "Users can view their own user record"
ON "User"
FOR SELECT
TO authenticated
USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own user record"
ON "User"
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can insert their own user record"
ON "User"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = id);
