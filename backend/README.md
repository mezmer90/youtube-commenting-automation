# YouTube Commenter Backend API

Backend service for YouTube Video Commenting Automation with YouTube Data API v3 integration.

## 🚀 Features

- **YouTube API Integration**: Fetch popular videos by keywords
- **Adaptive View Filtering**: Automatically adjust view count thresholds per category
- **PostgreSQL Database**: Store videos with metadata in Railway Postgres
- **REST API**: Full API for video management and progress tracking
- **Auto-Population**: Bulk populate categories with YouTube videos

---

## 📋 Prerequisites

- Node.js 18+
- Railway account with PostgreSQL database
- YouTube Data API v3 key (from Google Cloud Console)
- Database already set up (see `/database` folder)

---

## 🔧 Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
PORT=3000
NODE_ENV=production

# Railway PostgreSQL
DATABASE_URL=postgresql://postgres:PASSWORD@ballast.proxy.rlwy.net:32467/railway

# YouTube Data API v3
YOUTUBE_API_KEY=AIzaSy...

# Optional
GEMINI_API_KEY=your-key
NOTION_API_KEY=your-key
```

### 3. Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **YouTube Data API v3**
4. Create API Key (Credentials → Create Credentials → API Key)
5. Copy the API key to `.env`

---

## 🎯 Usage

### Local Development

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Production

```bash
npm start
```

### Populate Videos

Run the populate script to fetch videos from YouTube:

```bash
npm run populate-videos
```

This will populate all categories with videos based on keywords defined in the script.

---

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Categories

```
GET  /api/categories           # Get all categories
GET  /api/categories/:id       # Get category by ID
GET  /api/categories/:id/stats # Get category statistics
```

### Videos

```
GET  /api/videos/next?category_id=1  # Get next uncommented video
POST /api/videos/update-status       # Update video status
```

Request body:
```json
{
  "category_id": 1,
  "video_id": "dQw4w9WgXcQ",
  "commented_status": "completed",
  "comment_text": "Great video!",
  "comment_type": "summary"
}
```

### Progress

```
GET  /api/progress/daily        # Get today's progress
POST /api/progress/increment    # Increment counter
GET  /api/progress/promo-texts  # Get promo texts
```

### Populate

```
POST /api/populate
```

Request body:
```json
{
  "category_name": "AI & Technology",
  "keywords": ["AI tutorial", "machine learning"],
  "max_results": 50,
  "order": "relevance",
  "adaptive_threshold": true,
  "upload_days": 730
}
```

---

## 🚂 Deploy to Railway

### Method 1: Railway CLI

```bash
# Login
railway login

# Initialize (if not already linked)
railway init

# Link to your existing project
railway link

# Add environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set YOUTUBE_API_KEY="AIzaSy..."

# Deploy
railway up
```

### Method 2: GitHub Integration

1. Push code to GitHub repo
2. In Railway dashboard:
   - New Project → Deploy from GitHub
   - Select your repo
   - Railway auto-detects Node.js
   - Add environment variables
   - Deploy!

### Method 3: Railway GUI

1. Create new service in Railway
2. Choose "Empty Service"
3. Connect to GitHub repo
4. Set environment variables
5. Deploy

---

## 🔐 Environment Variables (Railway)

Set these in Railway dashboard under Variables:

```
DATABASE_URL=postgresql://...
YOUTUBE_API_KEY=AIzaSy...
PORT=3000
NODE_ENV=production
CORS_ORIGIN=*
```

---

## 📊 Video Population

The `populate-videos.js` script fetches videos from YouTube based on:

- **Keywords**: Search terms for each category
- **View Count**: Adaptive threshold (auto-adjusts per category)
- **Upload Date**: Last 2 years (730 days)
- **Max Results**: 50 videos per keyword
- **Duplicates**: Automatically skipped

### Customize Population

Edit `src/scripts/populate-videos.js`:

```javascript
await populateCategory(
    'Your Category Name',
    ['keyword1', 'keyword2', 'keyword3'],
    {
        maxResults: 50,
        order: 'relevance', // or 'viewCount', 'date'
        adaptiveThreshold: true,
        uploadDays: 730
    }
);
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js           # PostgreSQL config
│   ├── routes/
│   │   ├── categories.js         # Category endpoints
│   │   ├── videos.js             # Video endpoints
│   │   ├── progress.js           # Progress tracking
│   │   └── populate.js           # Population endpoint
│   ├── services/
│   │   ├── youtube-api.js        # YouTube API service
│   │   └── database-service.js   # Database operations
│   ├── scripts/
│   │   └── populate-videos.js    # Population script
│   └── server.js                 # Express server
├── package.json
├── railway.json
└── README.md
```

---

## 🔧 Troubleshooting

### "YOUTUBE_API_KEY not set"
- Make sure `.env` file exists with `YOUTUBE_API_KEY`
- For Railway, set in dashboard Variables

### "Quota exceeded" (YouTube API)
- YouTube API has daily quota (10,000 units)
- Each search uses ~100 units
- Reduce `maxResults` or wait 24 hours

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check Railway database is running
- Ensure SSL is enabled (handled automatically)

### No videos found
- Lower `min_view_threshold` in categories table
- Try different keywords
- Use `order: 'viewCount'` instead of `'relevance'`

---

## 📈 API Quota Management

YouTube Data API quota: 10,000 units/day

- Search: 100 units
- Video details: 1 unit per video
- Channel info: 1 unit

Example:
- 10 keywords × 50 videos = 500 search units + 500 details units = 1,000 units total

---

## 🎉 Next Steps

1. ✅ Backend deployed to Railway
2. 📊 Populate videos using `/api/populate` or script
3. 🎨 Build Chrome extension
4. 🔗 Connect extension to backend API
5. 🚀 Start commenting!

---

## 📝 License

Internal tool - Not for public distribution

---

**GitHub Repo**: https://github.com/mezmer90/youtube-commenting-automation
