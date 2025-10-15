# Database Setup Guide - Railway PostgreSQL

This directory contains database migration scripts and setup utilities for the YouTube Commenting Automation project.

## 📋 Prerequisites

- Node.js installed
- Railway account with PostgreSQL database created
- Railway CLI installed (already done ✅)

## 🚀 Quick Start

### Step 1: Create Railway PostgreSQL Database

1. Go to [railway.app](https://railway.app)
2. Create a new project or use existing one
3. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
4. Wait for provisioning to complete

### Step 2: Get Database Credentials

In your Railway PostgreSQL service:
1. Go to **"Variables"** tab
2. Copy the **DATABASE_URL** (it looks like this):
   ```
   postgresql://postgres:PASSWORD@containers-us-west-xxx.railway.app:PORT/railway
   ```

### Step 3: Set Up Environment

1. Copy the example env file:
   ```bash
   cd database
   cp .env.example .env
   ```

2. Edit `.env` and paste your DATABASE_URL:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@your-host.railway.app:PORT/railway
   ```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Test Connection

```bash
npm run test-connection
```

Expected output:
```
✅ Connected successfully!
📊 PostgreSQL Version: PostgreSQL 16.x...
🗄️  Current Database: railway
📋 Tables in database: (No tables yet - run migration first)
✅ Connection test passed!
```

### Step 6: Run Migration

```bash
npm run migrate
```

This will:
- Create all necessary tables
- Set up triggers and functions
- Insert sample categories (AI & Technology, Marketing, Fitness)
- Insert default promo texts

Expected output:
```
✅ Migration completed successfully!
📊 Tables created:
  ✓ categories
  ✓ extension_settings
  ✓ daily_progress
  ✓ videos_ai_technology
  ✓ videos_marketing
  ✓ videos_fitness_health
🎉 Database setup complete!
```

## 🔧 Alternative: Using Railway CLI

### Method 1: Using Railway CLI Environment

1. Login to Railway:
   ```bash
   railway login
   ```

2. Link to your project:
   ```bash
   railway link
   ```
   (Select your project from the list)

3. Run migration directly:
   ```bash
   railway run npm run migrate
   ```

### Method 2: Pass DATABASE_URL Directly

```bash
node run-migration.js "postgresql://postgres:PASSWORD@host.railway.app:PORT/railway"
```

## 📊 Database Schema

### Tables Created:

1. **categories** - Stores video categories and settings
2. **extension_settings** - Stores promo texts and configurations
3. **daily_progress** - Tracks daily commenting progress
4. **videos_{category}** - Dynamic tables for each category (auto-created)

### Sample Categories:

- `videos_ai_technology` - AI & Technology videos
- `videos_marketing` - Marketing videos
- `videos_fitness_health` - Fitness & Health videos

## 🔍 Verifying the Setup

After migration, verify everything:

```bash
npm run test-connection
```

You should see all tables listed.

## 📝 Adding New Categories

To add a new category, simply insert into the categories table:

```sql
INSERT INTO categories (name, table_name, min_view_threshold)
VALUES ('Your Category Name', 'videos_your_category', 100000);
```

The corresponding `videos_your_category` table will be created automatically via trigger!

## 🗄️ Database Structure

Each category video table contains:
- Video metadata (title, channel, views, likes, etc.)
- Summary status and text
- Comment status and text
- Notion integration tracking
- Timestamps

## 🔧 Troubleshooting

### Error: "No DATABASE_URL provided"
- Make sure `.env` file exists in the `database/` directory
- Verify DATABASE_URL is set correctly

### Error: "Connection refused"
- Check Railway database is running
- Verify DATABASE_URL is correct
- Check firewall settings

### Error: "SSL connection required"
- The migration script already includes SSL config
- If issues persist, check Railway's SSL requirements

## 📚 Scripts Available

- `npm run migrate` - Run database migration
- `npm run test-connection` - Test database connection
- `npm run add-sample-videos` - Add sample video data (coming soon)

## 🔗 Next Steps

After successful database setup:

1. ✅ Database schema is ready
2. 📝 Populate video tables with YouTube data
3. 🔗 Configure Notion database IDs
4. 🚀 Set up backend API
5. 🎨 Build Chrome extension

---

**Need help?** Check the main project documentation in `TECHNICAL_SPECIFICATION.md`
