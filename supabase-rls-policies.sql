-- Row Level Security (RLS) Policies for Pawkit Mobile App
-- These policies allow users to access their own data directly from the mobile app

-- Enable RLS on Card table
ALTER TABLE "Card" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Collection table
ALTER TABLE "Collection" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Card Policies: Users can only access their own cards
-- Note: auth.uid() returns UUID, userId is TEXT, so we cast with ::text
CREATE POLICY "Users can view their own cards"
ON "Card"
FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert their own cards"
ON "Card"
FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own cards"
ON "Card"
FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own cards"
ON "Card"
FOR DELETE
USING (auth.uid()::text = "userId");

-- Collection Policies: Users can only access their own collections
CREATE POLICY "Users can view their own collections"
ON "Collection"
FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert their own collections"
ON "Collection"
FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own collections"
ON "Collection"
FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own collections"
ON "Collection"
FOR DELETE
USING (auth.uid()::text = "userId");

-- User Policies: Users can only view/update their own user record
CREATE POLICY "Users can view their own user record"
ON "User"
FOR SELECT
USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own user record"
ON "User"
FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- Allow users to insert their own user record (for first-time signup)
CREATE POLICY "Users can insert their own user record"
ON "User"
FOR INSERT
WITH CHECK (auth.uid()::text = id);

-- Enable RLS on UserSettings table
ALTER TABLE "UserSettings" ENABLE ROW LEVEL SECURITY;

-- UserSettings Policies: Users can only access their own settings
CREATE POLICY "Users can view their own settings"
ON "UserSettings"
FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert their own settings"
ON "UserSettings"
FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own settings"
ON "UserSettings"
FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own settings"
ON "UserSettings"
FOR DELETE
USING (auth.uid()::text = "userId");
