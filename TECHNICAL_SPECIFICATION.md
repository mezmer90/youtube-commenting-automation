# YouTube Video Commenting Automation - Technical Specification

## Project Overview

An internal Chrome extension that automates the process of commenting on 100 YouTube videos per day across multiple categories. The system generates AI-powered summaries, creates engaging comments with promo text, and saves all summaries to category-specific Notion databases.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome Extension (Manifest V3)               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   Popup UI   │  │Content Script│  │   Background.js     │  │
│  │  - Category  │  │ - YT Page    │  │  - API Calls        │  │
│  │  - Progress  │  │ - Comment    │  │  - Daily Counter    │  │
│  │  - Settings  │  │ - Transcript │  │  - State Management │  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend API (Node.js/Express on Railway)           │
│  - Video CRUD operations (fetch, update status)                │
│  - AI summarization (Google Gemini 2.5 Flash Lite)             │
│  - Comment generation (random type: summary/chapters/takeaways)│
│  - Daily progress tracking (GMT+5:30 timezone)                 │
│  - Category management                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼──────────────────┐
            ▼                 ▼                  ▼
    ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
    │Railway Postgres│  │Google Gemini │  │  Notion API  │
    │  - Categories  │  │  2.5 Flash   │  │  - Category  │
    │  - Videos      │  │  - Summary   │  │    Databases │
    │  - Status      │  │  - Comments  │  │              │
    └───────────────┘  └──────────────┘  └──────────────┘
```

---

## Database Schema (Railway Postgres)

### 1. Dynamic Category Tables
Each category has its own table (e.g., `videos_ai`, `videos_marketing`, `videos_fitness`)

```sql
CREATE TABLE videos_{category_name} (
    -- Primary Key
    id SERIAL PRIMARY KEY,

    -- Video Identifiers
    video_id VARCHAR(20) UNIQUE NOT NULL,
    url TEXT NOT NULL,

    -- Basic Info (from YouTube Data API v3)
    title TEXT NOT NULL,
    channel_name TEXT,
    channel_url TEXT,
    channel_subscriber_count TEXT,
    view_count BIGINT,
    likes INTEGER,
    duration TEXT,
    thumbnail_url TEXT,
    upload_date TIMESTAMP,

    -- Metadata
    tags TEXT[],
    description TEXT,

    -- Summary Status
    summary_status VARCHAR(20) DEFAULT 'pending',  -- pending, completed, failed
    summary_text TEXT,
    summary_generated_at TIMESTAMP,

    -- Comment Status
    commented_status VARCHAR(20) DEFAULT 'pending',  -- pending, completed, failed
    commented_at TIMESTAMP,
    comment_type VARCHAR(20),  -- summary, chapters, takeaways
    comment_text TEXT,
    promo_text TEXT,
    promo_position VARCHAR(10),  -- top, bottom

    -- Notion Integration
    notion_saved BOOLEAN DEFAULT FALSE,
    notion_page_id TEXT,
    notion_saved_at TIMESTAMP,

    -- Timestamps
    date_added TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_{category}_commented_status ON videos_{category_name}(commented_status);
CREATE INDEX idx_{category}_summary_status ON videos_{category_name}(summary_status);
CREATE INDEX idx_{category}_date_added ON videos_{category_name}(date_added DESC);
```

### 2. Categories Metadata Table

```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    table_name VARCHAR(100) UNIQUE NOT NULL,

    -- Notion Integration
    notion_database_id TEXT,
    notion_database_name TEXT,

    -- Statistics
    total_videos INTEGER DEFAULT 0,
    completed_videos INTEGER DEFAULT 0,

    -- Settings
    min_view_threshold BIGINT DEFAULT 100000,  -- Adaptive per category

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sample Data
INSERT INTO categories (name, table_name, min_view_threshold) VALUES
('AI & Technology', 'videos_ai', 100000),
('Marketing', 'videos_marketing', 50000),
('Fitness', 'videos_fitness', 50000);
```

### 3. Daily Progress Tracking

```sql
CREATE TABLE daily_progress (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    videos_commented INTEGER DEFAULT 0,
    categories_worked TEXT[],
    last_reset_at TIMESTAMP,
    timezone VARCHAR(20) DEFAULT 'Asia/Kolkata',  -- GMT+5:30
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to reset counter at GMT+5:30 midnight
CREATE OR REPLACE FUNCTION reset_daily_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date != CURRENT_DATE THEN
        INSERT INTO daily_progress (date, videos_commented, last_reset_at)
        VALUES (CURRENT_DATE, 0, NOW())
        ON CONFLICT (date) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_daily_progress
AFTER INSERT OR UPDATE ON daily_progress
FOR EACH ROW
EXECUTE FUNCTION reset_daily_progress();
```

### 4. Extension Settings (Stored in Backend)

```sql
CREATE TABLE extension_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Promo Texts
INSERT INTO extension_settings (setting_key, setting_value, description) VALUES
('promo_text_1', '📌 This summary was generated with [YourTool]', 'Promo text variant 1'),
('promo_text_2', '🎥 Generated chapter breakdown using www.yourtool.com', 'Promo text variant 2'),
('promo_text_3', '💡 Want to summarize other videos? Search for [YourTool] on Google', 'Promo text variant 3'),
('promo_text_4', '⚡ Auto-summarized with [YourTool] - Try it yourself!', 'Promo text variant 4');
```

---

## Backend API Specification

### Base URL
```
https://yt-commenter-backend.railway.app/api
```

### Endpoints

#### 1. **Category Management**

**GET /categories**
```javascript
// Response
{
  "success": true,
  "categories": [
    {
      "id": 1,
      "name": "AI & Technology",
      "table_name": "videos_ai",
      "notion_database_id": "abc123",
      "notion_database_name": "AI Videos",
      "total_videos": 150,
      "completed_videos": 23,
      "min_view_threshold": 100000
    }
  ]
}
```

#### 2. **Video Operations**

**GET /videos/next**
```javascript
// Request
{
  "category_id": 1
}

// Response
{
  "success": true,
  "video": {
    "id": 42,
    "video_id": "dQw4w9WgXcQ",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "title": "Amazing AI Tutorial",
    "channel_name": "Tech Channel",
    "view_count": 250000,
    "duration": "15:32",
    "thumbnail_url": "https://...",
    "commented_status": "pending"
  }
}
```

**POST /videos/update-status**
```javascript
// Request
{
  "video_id": 42,
  "category_id": 1,
  "status_type": "commented",  // or "summary"
  "status": "completed",
  "comment_text": "...",
  "comment_type": "summary",  // summary, chapters, takeaways
  "promo_text": "...",
  "promo_position": "bottom"
}

// Response
{
  "success": true,
  "message": "Video status updated"
}
```

#### 3. **AI Processing**

**POST /summarize**
```javascript
// Request
{
  "video_id": "dQw4w9WgXcQ",
  "transcript": "Full video transcript...",
  "metadata": {
    "title": "...",
    "channel": "...",
    "duration": "..."
  }
}

// Response
{
  "success": true,
  "summary": "Comprehensive video summary...",
  "processing_time_ms": 3500
}
```

**POST /generate-comment**
```javascript
// Request
{
  "summary": "Video summary text...",
  "type": "random",  // or "summary", "chapters", "takeaways"
  "video_metadata": {
    "title": "...",
    "duration": "..."
  }
}

// Response
{
  "success": true,
  "comment": {
    "type": "chapters",
    "text": "📍 Chapter Breakdown:\n0:00 Intro\n2:30 Main Topic...",
    "promo_text": "🎥 Generated with [Tool]",
    "promo_position": "top",
    "final_comment": "[Promo]\n\n[Comment Text]"
  }
}
```

#### 4. **Progress Tracking**

**GET /progress/daily**
```javascript
// Response
{
  "success": true,
  "date": "2025-10-14",
  "videos_commented": 23,
  "target": 100,
  "percentage": 23,
  "categories_worked": ["AI & Technology", "Marketing"],
  "time_until_reset": "8h 32m"  // Until GMT+5:30 midnight
}
```

**POST /progress/increment**
```javascript
// Request
{
  "category_name": "AI & Technology"
}

// Response
{
  "success": true,
  "new_count": 24,
  "target": 100,
  "remaining": 76
}
```

#### 5. **Notion Integration**

**POST /notion/validate-database**
```javascript
// Request
{
  "category_name": "AI & Technology",
  "notion_database_id": "abc123xyz"
}

// Response
{
  "success": true,
  "database_name": "AI & Technology",
  "is_valid": true,
  "message": "Database name matches category"
}
```

**POST /notion/save-summary**
```javascript
// Request
{
  "category_id": 1,
  "video_id": 42,
  "summary": "...",
  "metadata": {...}
}

// Response
{
  "success": true,
  "notion_page_id": "page_abc123",
  "notion_url": "https://notion.so/..."
}
```

---

## Chrome Extension Architecture

### Manifest v3 Configuration

```json
{
  "manifest_version": 3,
  "name": "YouTube Video Commenter",
  "version": "1.0.0",
  "description": "Automate YouTube commenting with AI-powered summaries",
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "clipboardWrite",
    "alarms"
  ],
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://yt-commenter-backend.railway.app/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/watch*"],
      "js": [
        "utils.js",
        "metadata-extractor.js",
        "transcript-processor.js",
        "content.js"
      ],
      "run_at": "document_end"
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

### File Structure

```
youtube-commenting-extension/
├── manifest.json
├── popup.html                   # Main UI
├── popup.js                     # Popup logic
├── content.js                   # YouTube page interaction
├── background.js                # Service worker (API, state)
├── config.js                    # Backend URL, constants
├── utils.js                     # Shared utilities (from commenter-v2)
├── metadata-extractor.js        # YouTube metadata (from summarizer)
├── transcript-processor.js      # Transcript extraction (from commenter-v2)
├── notion-integration.js        # Notion API (from summarizer)
├── toast-manager.js             # Toast notifications (from commenter-v2)
├── styles.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## User Flow & Workflow

### Step 1: Extension Popup UI

```
┌────────────────────────────────────────────┐
│  🎬 YouTube Video Commenter                │
├────────────────────────────────────────────┤
│  Category: [📊 AI & Technology ▼]         │
│  Progress: 23/100 (23%) ✅                 │
│  Time to Reset: 8h 32m                     │
├────────────────────────────────────────────┤
│  Current Video: Not loaded                 │
│                                            │
│  [🎬 Load Next Video]                      │
├────────────────────────────────────────────┤
│  Tabs: [Main] [Settings] [History]        │
└────────────────────────────────────────────┘
```

### Step 2: Load Next Video Flow

1. **User clicks "Load Next Video"**
   - Extension calls `GET /videos/next` with selected category
   - Receives video URL and metadata

2. **Open video in current tab**
   - Navigate to YouTube video URL
   - Content script activates on page load

3. **Auto-start processing**
   - Extract transcript using `transcript-processor.js`
   - Show progress toast: "🔄 Extracting transcript..."

4. **Generate summary**
   - Call `POST /summarize` with transcript
   - Show progress: "🤖 Generating summary... (70%)"

5. **Generate comment**
   - Call `POST /generate-comment` with random type
   - Randomly select promo text and position
   - Show progress: "💬 Creating comment... (90%)"

6. **Auto-fill comment box**
   - Detect YouTube comment textarea
   - Fill with generated comment
   - Show success: "✅ Comment ready! Review and post manually"

7. **Save to Notion**
   - Call `POST /notion/save-summary`
   - Save to category-specific database
   - Show notification: "📝 Saved to Notion: AI & Technology"

8. **Update status**
   - Mark video as `commented` in database
   - Increment daily progress counter
   - Update popup UI

### Step 3: Manual Submission

- User reviews the auto-filled comment
- User clicks YouTube's "Comment" button
- YouTube posts the comment
- User clicks "Next Video" to continue

---

## Comment Generation Logic

### 1. Random Type Selection

```javascript
// Truly random unless user manually selects
const commentTypes = ['summary', 'chapters', 'takeaways'];
const selectedType = userSelection || commentTypes[Math.floor(Math.random() * 3)];
```

### 2. Comment Templates

#### Summary Comment
```
[Promo Text - if position = 'top']

📝 Quick Summary:
[AI-generated summary in 3-5 bullet points]

Key Takeaways:
• [Takeaway 1]
• [Takeaway 2]
• [Takeaway 3]

[Promo Text - if position = 'bottom']
```

#### Chapter Breakdown Comment
```
[Promo Text - if position = 'top']

📍 Chapter Breakdown:
0:00 - Introduction
2:15 - [Topic 1]
5:30 - [Topic 2]
10:45 - [Topic 3]
15:20 - Conclusion

[Promo Text - if position = 'bottom']
```

#### Takeaways Comment
```
[Promo Text - if position = 'top']

💡 Key Takeaways from this video:

1. [Takeaway 1 with brief explanation]
2. [Takeaway 2 with brief explanation]
3. [Takeaway 3 with brief explanation]

Hope this helps! 🙌

[Promo Text - if position = 'bottom']
```

### 3. Promo Text Logic

```javascript
// 4 promo text variants (fetched from backend settings)
const promoTexts = await fetchPromoTexts();  // From extension_settings table

// Random selection
const selectedPromo = promoTexts[Math.floor(Math.random() * promoTexts.length)];

// Random position (50/50 chance)
const position = Math.random() > 0.5 ? 'top' : 'bottom';

// Combine
const finalComment = position === 'top'
  ? `${selectedPromo}\n\n${commentText}`
  : `${commentText}\n\n${selectedPromo}`;
```

---

## Notion Integration Flow

### 1. Category Database Mapping

When user selects a category:
1. Check if Notion database is already mapped
2. If not, prompt user to select database
3. Validate database name matches category name
4. Save mapping to `categories` table

```javascript
// Example validation
async function validateNotionDatabase(categoryName, databaseId) {
  const database = await notion.getDatabase(databaseId);
  const dbName = extractDatabaseTitle(database);

  if (dbName.toLowerCase().includes(categoryName.toLowerCase())) {
    return { valid: true, message: 'Database name matches!' };
  } else {
    return { valid: false, message: 'Database name must match category name' };
  }
}
```

### 2. Database Schema per Category

Each category Notion database should have these properties:
- **Name** (title): Video title
- **Video URL** (url): YouTube link
- **Channel** (text): Channel name
- **View Count** (number): Views
- **Duration** (text): Video length
- **Processing Mode** (select): summary/chapters/takeaways
- **Tags** (multi-select): Auto-generated tags
- **Created** (date): Timestamp
- **Content** (rich text): Full summary
- **Status** (select): Draft/Published

### 3. Auto-save Flow

After generating summary:
1. Check category has Notion database mapped
2. Create page in Notion with metadata
3. Add summary as page content (with markdown formatting)
4. Update database: `notion_saved = true`, `notion_page_id = xxx`
5. Show toast: "✅ Saved to Notion: [Category Name]"

---

## Daily Progress Tracking

### GMT+5:30 Midnight Reset

```javascript
// Background service worker checks time
chrome.alarms.create('checkMidnight', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkMidnight') {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;  // GMT+5:30
    const istTime = new Date(now.getTime() + istOffset);

    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();

    // Check if it's midnight (00:00) in IST
    if (hours === 0 && minutes === 0) {
      await resetDailyProgress();
    }
  }
});
```

### Progress Display

```javascript
// Popup displays
{
  "date": "2025-10-14",
  "videos_commented": 23,
  "target": 100,
  "percentage": 23,
  "time_until_reset": "8h 32m"
}
```

---

## Settings Panel

```
┌────────────────────────────────────────────┐
│  ⚙️ Settings                               │
├────────────────────────────────────────────┤
│  Backend API:                              │
│  [https://yt-commenter.railway.app]        │
│                                            │
│  Notion Integration:                       │
│  API Key: [********************]           │
│  [🔗 Connect Notion]                       │
│                                            │
│  Comment Settings:                         │
│  □ Manual type selection                   │
│  ☑ Random type (summary/chapters/quotes)   │
│                                            │
│  Promo Texts:                              │
│  1. [This summary was generated with...]   │
│  2. [Generated chapter breakdown using...] │
│  3. [Want to summarize other videos?...]   │
│  4. [Auto-summarized with...]              │
│  [✏️ Edit Promo Texts]                     │
│                                            │
│  Daily Target: [100] videos                │
│  Timezone: GMT+5:30 (IST)                  │
│                                            │
│  [💾 Save Settings]                        │
└────────────────────────────────────────────┘
```

---

## Reusable Code from Existing Extensions

### From `youtube-commenter-ai-v2`:
1. **Toast Notifications** (`toast.js`)
   - Progress indicators with animations
   - Success/error messages

2. **Transcript Extraction** (`transcript-processor.js`)
   - Extract YouTube transcripts with timestamps
   - Handle long transcripts

3. **Comment Auto-fill** (`content.js`)
   - Detect YouTube comment textarea
   - Auto-fill comment box
   - Handle YouTube's dynamic DOM

4. **Utils** (`utils.js`)
   - Common helper functions
   - API call wrappers

### From `youtube-summarizer-v8.0-stripe`:
1. **Notion Integration** (`notion.js`)
   - Create/update Notion pages
   - Database property mapping
   - Markdown to Notion blocks conversion

2. **Metadata Extraction** (`metadata-extractor.js`)
   - Extract video metadata from DOM
   - Handle all YouTube page variations

3. **Backend API Communication** (`backend-api.js`)
   - API call patterns
   - Error handling

4. **Progress UI Patterns** (`popup.js`)
   - Progress bars
   - Status indicators

---

## Implementation Phases

### Phase 1: Backend Setup (2-3 days)
- [ ] Set up Node.js/Express on Railway
- [ ] Create PostgreSQL database schema
- [ ] Implement API endpoints
- [ ] Integrate Google Gemini 2.5 Flash Lite
- [ ] Test with sample data

### Phase 2: Extension Core (3-4 days)
- [ ] Set up extension manifest and structure
- [ ] Build popup UI (category selector, progress)
- [ ] Implement background service worker
- [ ] Create content script for YouTube
- [ ] Integrate transcript extraction

### Phase 3: Comment Generation (2 days)
- [ ] Implement random type selection
- [ ] Build comment templates
- [ ] Add promo text rotation
- [ ] Test comment auto-fill

### Phase 4: Notion Integration (2 days)
- [ ] Adapt Notion code from summarizer
- [ ] Implement per-category databases
- [ ] Add validation logic
- [ ] Test summary saving

### Phase 5: Progress & Polish (2 days)
- [ ] Daily counter with GMT+5:30 reset
- [ ] Progress display in popup
- [ ] Error handling
- [ ] Testing & documentation

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL (Railway) |
| **AI Model** | Google Gemini 2.5 Flash Lite |
| **Storage** | Notion API (summaries) |
| **Extension** | Chrome Manifest V3 |
| **Deployment** | Railway (backend) |
| **Data Fetching** | YouTube Data API v3 + DOM Scraping |

---

## Estimated Timeline

**Total: 10-14 days**

---

## Security & Best Practices

1. **API Keys**: Store in backend environment variables
2. **Rate Limiting**: Implement on backend endpoints
3. **Error Handling**: Graceful degradation for all operations
4. **Logging**: Comprehensive logs for debugging
5. **Privacy**: No user data stored, all processing is per-session

---

## Next Steps

1. ✅ Review and approve this specification
2. Set up Railway backend project
3. Create database schema
4. Implement backend API
5. Build Chrome extension
6. Test end-to-end workflow
7. Deploy and monitor

---

**Document Version**: 1.0
**Last Updated**: 2025-10-14
**Status**: Ready for Implementation
