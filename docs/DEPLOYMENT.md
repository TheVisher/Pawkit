# Pawkit Deployment Guide

## Prerequisites
- Git repository (GitHub, GitLab, or Bitbucket)
- Supabase account
- Vercel account

## Step 1: Set Up Supabase Database

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - Project name: `pawkit` (or your preference)
   - Database password: Create a strong password (SAVE THIS!)
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)
5. Once created, go to **Project Settings** (gear icon) → **Database**
6. Under "Connection string" → "URI", copy the connection string
7. It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`
8. Replace `[YOUR-PASSWORD]` with your actual database password

## Step 2: Run Database Migrations Locally

1. Create a `.env.local` file in your project root:
   ```bash
   DATABASE_URL="your-supabase-connection-string-here"
   ```

2. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

3. Create the database schema:
   ```bash
   npx prisma migrate deploy
   ```

   Or if you want to create a new migration:
   ```bash
   npx prisma migrate dev --name init
   ```

## Step 3: Set Up Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your Git repository (authorize Vercel if needed)
4. Configure project:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: ./
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: .next (default)

## Step 4: Configure Environment Variables in Vercel

1. In your Vercel project settings, go to **Settings** → **Environment Variables**
2. Add the following variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Supabase connection string from Step 1
   - **Environment**: Production, Preview, Development (select all)
3. Click "Save"

## Step 5: Deploy

1. Click "Deploy" button in Vercel
2. Wait for build to complete (~2-3 minutes)
3. Once deployed, click "Visit" to see your live site!

## Post-Deployment

### Custom Domain (Optional)
1. In Vercel project → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

### Environment Variables Updates
- If you need to update environment variables, go to Vercel project → **Settings** → **Environment Variables**
- After updating, you'll need to redeploy (Vercel → **Deployments** → click "..." → "Redeploy")

### Database Migrations
When you make schema changes:
1. Update your Prisma schema locally
2. Run: `npx prisma migrate dev --name your_migration_name`
3. Commit the migration files to git
4. Push to your repository
5. Vercel will auto-deploy with the new migration

### Monitoring
- Check logs in Vercel dashboard under "Deployments" → Click on deployment → "Logs"
- Monitor database usage in Supabase dashboard

## Troubleshooting

### Build fails with Prisma error
- Ensure `DATABASE_URL` is set in Vercel environment variables
- Check that `postinstall` script in package.json includes `prisma generate`

### Database connection issues
- Verify connection string is correct (no extra spaces)
- Check if Supabase project is paused (free tier pauses after inactivity)
- Ensure connection string includes `?schema=public` at the end if needed

### App works locally but not on Vercel
- Check environment variables are set for "Production"
- Review build logs in Vercel for specific errors
- Ensure all dependencies are in `dependencies` not `devDependencies`

## Quick Commands Reference

```bash
# Generate Prisma client
npm run prisma:generate

# Create and apply new migration
npx prisma migrate dev --name migration_name

# Apply existing migrations (for production)
npx prisma migrate deploy

# Open Prisma Studio to view data
npx prisma studio

# Build locally to test
npm run build

# Run production build locally
npm run start
```
