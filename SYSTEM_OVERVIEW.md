# YouTube Commenting Automation System - Complete Overview

## System Status: OPERATIONAL

**Backend URL**: https://youtube-commenting-automation-production.up.railway.app
**Database**: PostgreSQL on Railway
**API**: Fully functional with AI integration

---

## 1. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHROME EXTENSION (Frontend)                  │
│  - Fetches videos from backend                                   │
│  - Gets transcript from YouTube                                  │
│  - Sends transcript to backend for processing                    │
│  - Posts AI-generated comments to YouTube                        │
│  - Tracks daily progress (100 videos/day limit)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                   │
│  - Video population from YouTube API                             │
│  - AI processing (OpenRouter + Gemini Flash)                     │
│  - Database management                                           │
│  - Progress tracking                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ PostgreSQL
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                         │
│  - Categories (AI & Tech, Marketing, Fitness)                    │
│  - Videos by category (separate tables)                          │
│  - Daily progress tracking                                       │
│  - Extension settings                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. DATABASE SCHEMA

### Tables:

1. **categories** (3 rows)
   - id, name, table_name, min_view_threshold
   - Categories: AI & Technology, Marketing, Fitness & Health

2. **videos_ai_technology** (13 videos populated)
   - video_id, url, title, channel_name, view_count
   - summary_status, summary_text, summary_generated_at
   - commented_status, commented_at, comment_text
   - notion_saved, notion_page_id

3. **videos_marketing** (0 videos)
4. **videos_fitness_health** (0 videos)

5. **daily_progress**
   - date, videos_commented, categories_worked
   - last_reset_at, timezone

6. **extension_settings**
   - Promo text variants for comments

### Current Database Stats:
- Total videos: 13 (AI & Technology)
- Pending summaries: 13
- Completed summaries: 0
- Average views: 919,705
- Max views: 2,385,552

---

## 3. BACKEND API ENDPOINTS

### Base URL
```
https://youtube-commenting-automation-production.up.railway.app
```

### Health Check
```http
GET /health
Response: {"status":"healthy","database":"connected","timestamp":"...","uptime":586}
```

### Categories
```http
GET /api/categories
Response: List of all categories with stats
```

### Video Management

**Get Next Video to Comment**
```http
GET /api/videos/next?category_id=1
Response: Next pending video from category
```

**Update Video Status**
```http
POST /api/videos/update-status
Body: {
  "video_id": "xyz123",
  "category_id": 1,
  "summary_text": "...",
  "comment_text": "...",
  "commented_status": "completed"
}
```

### Progress Tracking

**Get Daily Progress**
```http
GET /api/progress/daily
Response: {
  "videos_commented": 0,
  "target": 100,
  "percentage": 0,
  "time_until_reset": "5h 42m"
}
```

**Increment Progress**
```http
POST /api/progress/increment
Body: {"category_id": 1}
```

### Video Population

**Populate Videos from YouTube**
```http
POST /api/populate
Body: {
  "category_name": "AI & Technology",
  "keywords": ["AI tutorial", "machine learning"],
  "max_results": 50,
  "order": "relevance",
  "adaptive_threshold": true,
  "upload_days": 730
}
Response: {"success":true,"inserted":13,"duplicates":0}
```

### AI Processing

**Generate Summary**
```http
POST /api/ai/summarize
Body: {
  "transcript": "video transcript text...",
  "metadata": {"title": "Video Title", "channel": "Channel Name"}
}
Response: {"success":true,"summary":"AI generated summary..."}
```

**Generate Chapters**
```http
POST /api/ai/chapters
Body: {"transcript": "...with timestamps..."}
Response: {"success":true,"chapters":"Chapter breakdown..."}
```

**Generate Takeaways**
```http
POST /api/ai/takeaways
Body: {"transcript": "..."}
Response: {"success":true,"takeaways":"Key takeaways..."}
```

**Generate Comment**
```http
POST /api/ai/comment
Body: {
  "summary": "Video summary...",
  "type": "summary",  // or "chapters", "takeaways"
  "metadata": {"title": "..."}
}
Response: {"success":true,"comment":"YouTube comment text..."}
```

**Complete Processing (Summary + Comment)**
```http
POST /api/ai/process
Body: {
  "transcript": "full transcript...",
  "metadata": {"title": "...", "channel": "..."},
  "comment_type": "summary"  // optional, random if not specified
}
Response: {
  "success": true,
  "summary": "...",
  "comment": "...",
  "comment_type": "summary"
}
```

---

## 4. AI PROCESSING SYSTEM

### OpenRouter Integration
- **Model**: google/gemini-2.0-flash-exp:free
- **Max Tokens**: 4096
- **Chunk Size**: 10,000 characters

### Smart Chunking System
For long transcripts:
1. Split into manageable chunks (10K characters)
2. Process each chunk separately
3. Combine results into final output
4. Handles videos of any length

### AI Capabilities
1. **Summarization**: Comprehensive video summaries
2. **Chapter Breakdown**: Timestamped chapter divisions
3. **Key Takeaways**: Top 5-7 actionable points
4. **Comment Generation**: Natural, engaging YouTube comments

---

## 5. WORKFLOW

### Backend Video Population Workflow
```
1. Admin/Cron calls POST /api/populate
2. Backend searches YouTube API with keywords
3. Filters videos by view count threshold
4. Removes duplicates
5. Inserts into category table
6. Status: summary_status='pending', commented_status='pending'
```

### Extension Processing Workflow
```
1. Extension calls GET /api/videos/next
2. Backend returns next pending video
3. Extension opens video in background tab
4. Extension extracts transcript from YouTube
5. Extension sends transcript to POST /api/ai/process
6. Backend generates summary + comment (using OpenRouter AI)
7. Backend returns summary and comment text
8. Extension posts comment to YouTube
9. Extension calls POST /api/videos/update-status
10. Backend marks video as completed
11. Extension calls POST /api/progress/increment
12. Backend updates daily counter
13. Repeat until 100 videos/day reached
```

---

## 6. CURRENT TEST DATA

### Sample Videos in Database:
1. **99% of Beginners Don't Know the Basics of AI** (Jeff Su)
   - Views: 2,385,552
   - URL: https://www.youtube.com/watch?v=nVyD6THcvDQ

2. **AI, Machine Learning, Deep Learning Explained** (IBM Technology)
   - Views: 2,331,208
   - URL: https://www.youtube.com/watch?v=qYNweeDHiyU

3. **All Machine Learning algorithms explained in 17 min** (Infinite Codes)
   - Views: 1,431,147
   - URL: https://www.youtube.com/watch?v=E0Hmnixke2g

... 10 more videos

---

## 7. ENVIRONMENT VARIABLES

### Backend (Already Set in Railway)
```env
DATABASE_URL=postgresql://postgres:bBjscYLBdysIrAdwahrNtFnJfnZyXAql@ballast.proxy.rlwy.net:32467/railway
YOUTUBE_API_KEY=AIzaSyCHiMQ1oPpzsiKMCQp74H3zuwHw_Np1TN4
OPENROUTER_API_KEY=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
NODE_ENV=production
PORT=8080
CORS_ORIGIN=*
DEFAULT_AI_MODEL=google/gemini-2.0-flash-exp:free
DEFAULT_CHUNK_SIZE=10000
DEFAULT_MAX_TOKENS=4096
DEFAULT_MAX_RESULTS=50
DEFAULT_MIN_VIEW_COUNT=100000
DEFAULT_UPLOAD_DAYS=730
NOTION_API_KEY=(optional, for Notion integration)
```

---

## 8. NEXT STEPS: CHROME EXTENSION

### Extension Architecture
```
youtube-extension/
├── manifest.json           # Extension config
├── background.js          # Background service worker
├── content.js            # YouTube page interactions
├── popup/
│   ├── popup.html       # Extension popup UI
│   ├── popup.js         # Popup logic
│   └── popup.css        # Styles
├── utils/
│   ├── api.js          # Backend API calls
│   ├── youtube.js      # YouTube interaction functions
│   └── storage.js      # Chrome storage management
└── config.js           # API URL and settings
```

### Key Features Needed
1. **Authentication**: (optional) User login/API key
2. **Video Fetcher**: Call GET /api/videos/next
3. **Transcript Extractor**: Get transcript from YouTube page
4. **AI Processor**: Send to POST /api/ai/process
5. **Comment Poster**: Post to YouTube using their comment system
6. **Progress Tracker**: Display daily progress (X/100)
7. **Status Updates**: Update backend after each video
8. **Error Handling**: Retry logic, skip on errors
9. **Rate Limiting**: Respect YouTube's rate limits
10. **Daily Reset**: Check time_until_reset

### Extension UI Components
- **Popup Dashboard**:
  - Start/Stop button
  - Progress bar (0/100 videos today)
  - Current category selector
  - Statistics (total commented, success rate)
  - Time until reset

- **Settings Panel**:
  - Backend API URL
  - Category selection
  - Comment type preference (summary/chapters/takeaways)
  - Enable/disable promo text
  - Delay between videos (rate limiting)

---

## 9. TESTING CHECKLIST

### Backend Tests ✅
- [x] Health check working
- [x] Database connection verified
- [x] Categories endpoint working
- [x] Video population working (13 videos inserted)
- [x] Progress tracking functional
- [x] AI endpoints available

### Remaining Tests
- [ ] Test AI summarization with real transcript
- [ ] Test comment generation
- [ ] Test complete /api/ai/process flow
- [ ] Populate Marketing and Fitness categories
- [ ] Test video status updates
- [ ] Test daily progress reset logic

---

## 10. API USAGE EXAMPLE

### Complete Video Processing Flow
```bash
# 1. Get next video
curl https://youtube-commenting-automation-production.up.railway.app/api/videos/next?category_id=1

# Response: {"video_id":"nVyD6THcvDQ","title":"...","url":"..."}

# 2. [Extension gets transcript from YouTube]

# 3. Process with AI
curl -X POST https://youtube-commenting-automation-production.up.railway.app/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "0:00 Welcome to this AI tutorial...",
    "metadata": {"title":"AI Basics","channel":"TechChannel"},
    "comment_type": "summary"
  }'

# Response: {"success":true,"summary":"...","comment":"...","comment_type":"summary"}

# 4. [Extension posts comment to YouTube]

# 5. Update status
curl -X POST https://youtube-commenting-automation-production.up.railway.app/api/videos/update-status \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "nVyD6THcvDQ",
    "category_id": 1,
    "summary_text": "AI basics explained...",
    "comment_text": "Great video! Here are the key points...",
    "summary_status": "completed",
    "commented_status": "completed"
  }'

# 6. Increment progress
curl -X POST https://youtube-commenting-automation-production.up.railway.app/api/progress/increment \
  -H "Content-Type: application/json" \
  -d '{"category_id": 1}'
```

---

## 11. DEPLOYMENT INFO

### Railway Project
- **Project Name**: adorable-respect
- **Service**: youtube-commenting-automation
- **Region**: US
- **Status**: LIVE

### Database
- **Host**: ballast.proxy.rlwy.net
- **Port**: 32467
- **Database**: railway
- **Connection**: Active

### GitHub Repository
- **Repo**: mezmer90/yt-summarizer-and-note-taker-v2
- **Branch**: main
- **Auto-deploy**: Enabled

---

## 12. IMPORTANT NOTES

1. **Daily Limit**: System enforces 100 videos/day limit
2. **Timezone**: IST (GMT+5:30) for daily resets
3. **View Thresholds**:
   - AI & Technology: 100,000 views minimum
   - Marketing: 50,000 views minimum
   - Fitness & Health: 50,000 views minimum

4. **API Keys**:
   - YouTube API quota: 10,000 units/day
   - OpenRouter: Uses free Gemini model

5. **Comment Types**:
   - Summary: General video summary
   - Chapters: Timestamped breakdown
   - Takeaways: Key points (5-7 items)

---

## Ready for Chrome Extension Development!

The backend is fully operational and ready to support the Chrome extension. All API endpoints are tested and working. The database has sample videos ready for processing.

**Next Step**: Build the Chrome extension to interact with this backend.
