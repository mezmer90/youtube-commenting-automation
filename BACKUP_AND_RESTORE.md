# Backup and Restore Guide

## Overview

This guide explains how to backup and restore the YouTube Commenting Automation System at any point in time.

## What Needs to Be Backed Up

### 1. Code Repository (Git)
- All source code
- Configuration files
- Database migrations
- Documentation

### 2. Database (PostgreSQL)
- Category definitions
- Video queues (all category tables)
- Progress tracking history
- Notion integration mappings

### 3. Environment Configuration
- Backend environment variables
- Extension configuration
- API keys and secrets

### 4. Notion Data (Optional)
- Existing Notion databases
- Notion pages with video summaries

## Backup Procedures

### A. Code Backup (Git)

#### Create Restore Point
```bash
# Tag current state
git tag -a v1.0-notion-complete -m "Description of this version"

# Push tags to remote
git push origin v1.0-notion-complete

# Push all code
git push origin master
```

#### Verify Backup
```bash
# List all tags
git tag -l

# Show tag details
git show v1.0-notion-complete
```

### B. Database Backup (Railway PostgreSQL)

#### Option 1: Railway CLI Backup
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Create database dump
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Option 2: Direct PostgreSQL Backup
```bash
# Using pg_dump (requires PostgreSQL client installed)
pg_dump "postgresql://user:pass@host:port/database" > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Option 3: Railway Dashboard Backup
1. Go to Railway dashboard
2. Select your project
3. Click on PostgreSQL service
4. Go to "Data" tab
5. Click "Backup Database"
6. Download backup file

#### Automated Daily Backups (Recommended)
```bash
# Create backup script: backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./database/backups"
mkdir -p $BACKUP_DIR

railway run pg_dump $DATABASE_URL > "$BACKUP_DIR/backup_$DATE.sql"

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql"
```

Run daily via cron:
```bash
# Add to crontab (runs at 2 AM daily)
0 2 * * * /path/to/backup.sh
```

### C. Environment Variables Backup

#### Backend .env File
```bash
# Copy .env to secure location
cp .env .env.backup_$(date +%Y%m%d)

# Or export to encrypted file
# Install: npm install -g dotenv-vault
dotenv-vault local backup
```

**Store securely**:
- Password manager (1Password, LastPass)
- Encrypted cloud storage
- Secure team vault

#### Extension Configuration
```bash
# Backup extension config
cp youtube-extension/config.js youtube-extension/config.js.backup_$(date +%Y%m%d)
```

### D. Notion Backup (Optional)

Notion has built-in version history, but for extra safety:

1. Export Notion workspace:
   - Settings & Members → Settings → Export all workspace content
   - Choose Markdown & CSV or HTML format
   - Download ZIP file

2. Store Notion database IDs (already in backend database)

## Restore Procedures

### Scenario 1: Restore Code to Previous Version

```bash
# List available restore points
git tag -l

# Restore to specific tag (creates new branch)
git checkout -b restore-point v1.0-notion-complete

# Or hard reset (CAUTION: destroys current work)
git reset --hard v1.0-notion-complete

# Verify restoration
git log --oneline -5
```

### Scenario 2: Restore Database

#### Full Database Restore
```bash
# Stop backend server first!
railway down youtube-commenting-automation-production

# Restore from backup
railway run psql $DATABASE_URL < backup_20251015_120000.sql

# Or using psql directly
psql "postgresql://user:pass@host:port/database" < backup_20251015_120000.sql

# Restart backend
railway up youtube-commenting-automation-production
```

#### Partial Table Restore (if only one table corrupted)
```sql
-- Drop corrupted table
DROP TABLE prompt_engineering_videos;

-- Restore just that table from backup
psql $DATABASE_URL < backup_20251015_120000.sql --table=prompt_engineering_videos
```

### Scenario 3: Complete System Restore (Disaster Recovery)

#### Prerequisites
- Git access to repository
- Database backup file
- Environment variables saved
- Railway account access

#### Steps

**1. Restore Code**
```bash
# Clone repository
git clone https://github.com/yourusername/yt-commenting-project.git
cd yt-commenting-project

# Checkout specific version
git checkout v1.0-notion-complete

# Install dependencies
npm install
```

**2. Restore Environment Variables**
```bash
# Create .env file with backed up values
cat > .env << EOL
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
YOUTUBE_API_KEY=...
NOTION_API_KEY=secret_...
NOTION_PARENT_PAGE_ID=...
PORT=3000
EOL
```

**3. Restore Database**
```bash
# Create new PostgreSQL instance in Railway (if needed)
railway add postgres

# Get new DATABASE_URL
railway variables

# Restore data
psql "$DATABASE_URL" < backup_20251015_120000.sql
```

**4. Deploy Backend**
```bash
# Link to Railway project
railway link

# Deploy
railway up
```

**5. Configure Extension**
```bash
# Update config.js with new backend URL
cd youtube-extension
# Edit config.js - set API_BASE_URL

# Load extension in Chrome
# chrome://extensions → Load unpacked → select youtube-extension/
```

**6. Verify System**
```bash
# Test backend health
curl https://your-railway-url.up.railway.app/health

# Test database connection
curl https://your-railway-url.up.railway.app/api/categories

# Test extension
# Open YouTube, click extension, check console logs
```

### Scenario 4: Migrate to New Railway Project

```bash
# 1. Create new Railway project
railway init

# 2. Add PostgreSQL
railway add postgres

# 3. Restore database
railway run psql $DATABASE_URL < backup_20251015_120000.sql

# 4. Set environment variables
railway variables set OPENAI_API_KEY=sk-...
railway variables set YOUTUBE_API_KEY=...
railway variables set NOTION_API_KEY=secret_...
railway variables set NOTION_PARENT_PAGE_ID=...

# 5. Deploy
railway up

# 6. Update extension config with new URL
```

## Backup Schedule Recommendations

| Component | Frequency | Retention | Priority |
|-----------|-----------|-----------|----------|
| Git Tags | Every major feature | Permanent | Critical |
| Database | Daily (automated) | 30 days | Critical |
| Database (weekly full) | Weekly | 6 months | High |
| Environment Variables | On change | Permanent | Critical |
| Notion Export | Monthly | 3 months | Low |

## Testing Backups

**Important**: Regularly test restore procedures!

```bash
# Test restore in isolated environment
# 1. Create test Railway project
railway init test-restore

# 2. Restore backup
railway add postgres
railway run psql $DATABASE_URL < backup_latest.sql

# 3. Deploy and test
railway up
curl https://test-restore.railway.app/health

# 4. Delete test project when confirmed
railway down
```

## What to Backup Before Major Changes

Before making significant changes:

```bash
# 1. Create git tag
git tag -a v1.x-before-change -m "Before implementing feature X"
git push origin v1.x-before-change

# 2. Backup database
railway run pg_dump $DATABASE_URL > backup_before_change.sql

# 3. Document current state
echo "Working features: ..." > STATE_BEFORE_CHANGE.md
git add STATE_BEFORE_CHANGE.md
git commit -m "Document state before change"
```

## Recovery Time Objectives (RTO)

| Scenario | Expected Recovery Time |
|----------|----------------------|
| Code rollback | 5 minutes |
| Database restore (partial) | 15 minutes |
| Database restore (full) | 30 minutes |
| Complete system restore | 1-2 hours |
| New Railway deployment | 2-3 hours |

## Emergency Contacts

- **Repository**: https://github.com/yourusername/yt-commenting-project
- **Railway Dashboard**: https://railway.app/dashboard
- **Database**: Check Railway PostgreSQL service logs
- **API Status**: https://your-railway-url.up.railway.app/health

## Backup Verification Checklist

After creating backup:

- [ ] Git tag created and pushed
- [ ] Database backup file created (verify file size > 0)
- [ ] Database backup can be opened/inspected
- [ ] Environment variables documented
- [ ] Backup location is secure and accessible
- [ ] Test restore in isolated environment (monthly)
- [ ] Document any changes to backup procedure
- [ ] Update this guide if procedures change

## Storage Recommendations

### Git Repository
- GitHub/GitLab (primary)
- Secondary git remote (backup)
- Local copy on admin machine

### Database Backups
- Railway built-in backups
- Cloud storage (AWS S3, Google Drive)
- Local encrypted backup (external drive)

### Environment Variables
- Password manager (1Password, LastPass)
- Encrypted file in separate repository
- Printed copy in secure physical location

## Important Notes

1. **Never commit `.env` to git** - Keep secrets out of version control
2. **Test restores regularly** - Don't wait for disaster to test
3. **Automate backups** - Manual backups are forgotten
4. **Document changes** - Update this guide when procedures change
5. **Multiple copies** - Follow 3-2-1 rule (3 copies, 2 different media, 1 offsite)
6. **Verify backups** - Check file integrity after creation
7. **Secure storage** - Encrypt sensitive backups

## 3-2-1 Backup Rule

- **3** copies of data
- **2** different storage types (cloud + local)
- **1** offsite backup

Example:
1. Production database (Railway) ← primary
2. Daily automated backup (Railway backup) ← same location
3. Weekly backup (AWS S3) ← cloud offsite
4. Monthly backup (local encrypted drive) ← physical offsite

## Quick Reference Commands

```bash
# Create restore point
git tag -a v1.x-milestone -m "Description" && git push origin v1.x-milestone

# Backup database
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore code
git checkout v1.x-milestone

# Restore database
psql "$DATABASE_URL" < backup_20251015.sql

# Verify system
curl https://your-url.railway.app/health
```

## Support

If restore fails:
1. Check Railway logs: `railway logs`
2. Check database connectivity: `railway run psql $DATABASE_URL -c "SELECT 1"`
3. Review this guide carefully
4. Check git history: `git log --oneline`
5. Verify environment variables: `railway variables`
