# Complete Features and Architecture Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Feature List](#feature-list)
3. [Data Flow](#data-flow)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Extension Architecture](#extension-architecture)
7. [Integration Details](#integration-details)
8. [Configuration](#configuration)

---

## System Architecture

### High-Level Overview

```
┌─────────────────┐
│  YouTube Page   │
│   (Content)     │
└────────┬────────┘
         │ Transcript
         │ Extraction
         ▼
┌─────────────────────────────────────┐
│   Chrome Extension (Manifest V3)    │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   Service    │  │   Content   │ │
│  │   Worker     │  │   Script    │ │
│  └──────┬───────┘  └──────┬──────┘ │
└─────────┼──────────────────┼────────┘
          │                  │
          │ API Calls        │ Page DOM
          ▼                  │ Interaction
┌───────────────────────────────────┐ │
│      Backend (Express.js)         │ │
│  ┌─────────┐  ┌──────────────┐   │ │
│  │   API   │  │   Services   │   │ │
│  │ Routes  │  │   Layer      │   │ │
│  └────┬────┘  └──────┬───────┘   │ │
└───────┼──────────────┼───────────┘ │
        │              │             │
        ▼              ▼             │
┌──────────────┐  ┌─────────────┐   │
│ PostgreSQL   │  │  OpenAI API │   │
│  (Railway)   │  │   GPT-4     │   │
└──────────────┘  └─────────────┘   │
        │                            │
        ▼                            │
┌──────────────┐                     │
│  Notion API  │◄────────────────────┘
│  (Storage)   │
└──────────────┘
```

### Component Breakdown

#### 1. Frontend (Chrome Extension)
- **Popup UI**: User interface for category selection and status
- **Content Script**: Runs on YouTube pages, extracts data, posts comments
- **Service Worker**: Background orchestration, API communication, Notion integration
- **Storage**: Chrome Storage API for settings and cache

#### 2. Backend (Node.js + Express)
- **API Layer**: RESTful endpoints for all operations
- **Service Layer**: Business logic, database operations, external API calls
- **Database Service**: PostgreSQL query abstraction
- **YouTube Service**: YouTube Data API v3 client
- **AI Service**: OpenAI integration for summaries/comments

#### 3. Database (PostgreSQL)
- **Core Tables**: Categories, progress tracking
- **Dynamic Tables**: One table per category for videos
- **Migrations**: Version-controlled schema changes

#### 4. External Integrations
- **OpenAI API**: AI-powered content generation
- **YouTube Data API**: Video metadata, channel info, search
- **Notion API**: Database creation, page creation, content storage

---

## Feature List

### Core Features

#### 1. Video Queue Management
- **Multi-Category Support**: Separate queues per video category
- **Priority Sorting**: Videos processed by view count (highest first)
- **Status Tracking**: pending → processing → completed
- **Error Handling**: Failed videos marked with error message
- **Manual Override**: Admin can manually select videos

#### 2. AI Content Generation
- **Summary Generation**:
  - Extracts key points from transcript
  - Formats with timestamps
  - Creates digestible overview
- **Comment Generation**:
  - Multiple styles (promo, plain)
  - Context-aware based on video content
  - Optional promo text inclusion
- **Smart Prompting**: Uses GPT-4 with custom prompts

#### 3. Notion Integration (Complete)

##### Database Management
- **Auto-Creation**: Creates "{Category Name} - Video Summaries" databases
- **Backend Persistence**: Stores database ID in PostgreSQL
- **Cross-Device Sync**: Same database used across all workers
- **Smart Lookup**: Backend-first → Notion search → Create new

##### Content Storage
- **Rich Pages**: Structured Notion pages with:
  - YouTube video embed (playable in Notion)
  - Summary with timestamps
  - AI-generated comment
  - Full transcript
  - Complete metadata
- **Text Chunking**:
  - Handles 2000 char limit per block
  - Smart splitting at natural breakpoints
  - Preserves readability
  - No data loss
- **Metadata Properties**:
  - Video Title
  - Channel Name
  - View Count
  - Like Count (from backend)
  - Subscriber Count (from backend)
  - Upload Date (from backend)
  - Video URL
  - Category
  - Processing Date

##### Backend Integration
- **Reliable Data**: 3 fields pulled from backend database
  - Likes count (more reliable than page extraction)
  - Subscriber count (fetched via YouTube API)
  - Upload date (normalized format)
- **Fallback Logic**: Falls back to page extraction if backend data unavailable

#### 4. Chrome Extension Features

##### User Interface
- **Category Selection**: Dropdown with all available categories
- **Daily Progress**: Shows X/50 videos processed today
- **Status Display**: Real-time updates during processing
- **Manual Mode**: Override daily limits for testing
- **Error Display**: Clear error messages if something fails

##### Processing Flow
1. User clicks "Start Processing"
2. Extension fetches next video from backend
3. Checks if YouTube page matches video
4. Extracts transcript from page
5. Sends to backend for AI processing
6. Posts comment to YouTube
7. Saves to Notion (with database auto-creation)
8. Updates progress counter
9. Shows success message with Notion URL

##### Service Worker Features
- **Background Processing**: Runs independently of tabs
- **Persistent State**: Survives browser restart
- **Message Passing**: Communicates with content scripts
- **API Communication**: All backend calls from worker
- **Notion Integration**: Complete Notion API client

#### 5. Admin Interface

##### Video Management
- **YouTube Search**:
  - Search by keyword
  - Filter by upload date, relevance, view count
  - Preview results with thumbnails
- **Bulk Add**:
  - Add multiple videos at once
  - Fetches full metadata from YouTube API
  - Includes channel subscriber counts
  - Stores in category-specific table
- **Video List**:
  - View all videos in category
  - Filter by status
  - Manual status updates

##### Category Management
- **CRUD Operations**: Create, read, update categories
- **Table Management**: Auto-creates database tables
- **Notion Sync**: View/update Notion database mappings

#### 6. Progress Tracking
- **Daily Counters**: Tracks videos processed per category per day
- **History**: Maintains historical progress data
- **Limits**: Enforces daily limits (configurable)
- **API Endpoints**: Query progress, increment counters

#### 7. YouTube Integration
- **Transcript Extraction**: Pulls transcript from YouTube page DOM
- **Comment Posting**: Posts comment using YouTube UI
- **Metadata Extraction**: Pulls title, channel, views, etc.
- **Data API**: Fetches additional data via YouTube Data API v3

---

## Data Flow

### End-to-End Video Processing

```
1. ADMIN ADDS VIDEOS
   Admin UI → POST /api/admin/bulk-add
   ↓
   YouTube Data API (fetch metadata + subscriber counts)
   ↓
   PostgreSQL (insert into category table)

2. EXTENSION STARTS PROCESSING
   Extension Popup → "Start Processing" click
   ↓
   Service Worker → GET /api/videos/next?category_id=1
   ↓
   Backend queries PostgreSQL → Returns video
   ↓
   Service Worker → Opens YouTube tab

3. TRANSCRIPT EXTRACTION
   Content Script → Waits for YouTube page load
   ↓
   Content Script → Extracts transcript from DOM
   ↓
   Content Script → Sends transcript to Service Worker

4. AI PROCESSING
   Service Worker → POST /api/ai/process
   ↓
   Backend → Sends transcript to OpenAI GPT-4
   ↓
   Backend → Returns summary + comment

5. COMMENT POSTING
   Service Worker → Sends comment to Content Script
   ↓
   Content Script → Clicks comment box
   ↓
   Content Script → Types comment
   ↓
   Content Script → Clicks "Comment" button
   ↓
   Content Script → Confirms success

6. NOTION SAVING
   Service Worker → Checks Notion settings
   ↓
   Service Worker → GET /api/categories/1 (get Notion DB ID)
   ↓
   If no DB ID:
      Service Worker → Searches Notion for existing DB
      ↓
      If not found: Creates new database in Notion
      ↓
      Service Worker → PATCH /api/categories/1/notion (save DB ID)
   ↓
   Service Worker → Creates Notion page (chunked content)
   ↓
   Service Worker → Returns Notion page URL

7. STATUS UPDATE
   Service Worker → POST /api/videos/update-status
   ↓
   Backend → Updates video status to 'completed'
   ↓
   Backend → Stores comment text, timestamp

8. PROGRESS INCREMENT
   Service Worker → POST /api/progress/increment
   ↓
   Backend → Increments daily counter

9. USER NOTIFICATION
   Service Worker → Sends success message to popup
   ↓
   Popup → Shows "Success!" with Notion URL link
```

---

## API Endpoints

### Categories

#### GET `/api/categories`
**Description**: Get all categories
**Response**:
```json
[
  {
    "id": 1,
    "name": "Prompt Engineering",
    "table_name": "prompt_engineering_videos",
    "notion_database_id": "abc123...",
    "notion_database_name": "Prompt Engineering - Video Summaries"
  }
]
```

#### GET `/api/categories/:id`
**Description**: Get single category (includes Notion info)
**Response**:
```json
{
  "id": 1,
  "name": "Prompt Engineering",
  "table_name": "prompt_engineering_videos",
  "notion_database_id": "abc123...",
  "notion_database_name": "Prompt Engineering - Video Summaries"
}
```

#### POST `/api/categories`
**Description**: Create new category
**Body**:
```json
{
  "name": "New Category"
}
```
**Response**: Created category object

#### PATCH `/api/categories/:id/notion`
**Description**: Sync Notion database info to backend
**Body**:
```json
{
  "notion_database_id": "abc123...",
  "notion_database_name": "Category Name - Video Summaries"
}
```
**Response**: Updated category object

### Videos

#### GET `/api/videos/next`
**Description**: Get next video to process
**Query Params**: `category_id` (required)
**Response**:
```json
{
  "video_id": "dQw4w9WgXcQ",
  "title": "Video Title",
  "channel_name": "Channel Name",
  "channel_id": "UCxxxxxx",
  "view_count": "1000000",
  "likes": "50000",
  "channel_subscriber_count": "500000",
  "upload_date": "2024-01-15",
  "video_url": "https://youtube.com/watch?v=...",
  "thumbnail_url": "https://i.ytimg.com/...",
  "duration": "PT10M30S",
  "commented_status": "pending"
}
```

#### POST `/api/videos/update-status`
**Description**: Update video status after processing
**Body**:
```json
{
  "video_id": "dQw4w9WgXcQ",
  "category_id": 1,
  "status": "completed",
  "comment_text": "Great video!...",
  "error_message": null
}
```
**Response**: Success message

### AI Processing

#### POST `/api/ai/process`
**Description**: Generate summary and comment from transcript
**Body**:
```json
{
  "transcript": "Full video transcript...",
  "metadata": {
    "title": "Video Title",
    "channelName": "Channel Name"
  },
  "comment_type": "promo"
}
```
**Response**:
```json
{
  "summary": "## Summary\n\n- Key point 1 (0:30)\n- Key point 2 (5:15)...",
  "comment": "Great breakdown of...",
  "summary_tokens": 500,
  "comment_tokens": 150
}
```

### Progress Tracking

#### GET `/api/progress/daily`
**Description**: Get today's progress for all categories
**Response**:
```json
{
  "date": "2025-10-15",
  "categories": [
    {
      "category_id": 1,
      "category_name": "Prompt Engineering",
      "count": 15
    }
  ]
}
```

#### POST `/api/progress/increment`
**Description**: Increment daily counter
**Body**:
```json
{
  "category_id": 1,
  "category_name": "Prompt Engineering"
}
```
**Response**: Updated progress object

### Admin Endpoints

#### GET `/api/admin/search-youtube`
**Description**: Search YouTube videos
**Query Params**: `q` (keyword), `maxResults` (default: 20)
**Response**: Array of video objects with metadata

#### POST `/api/admin/bulk-add`
**Description**: Add multiple videos to category
**Body**:
```json
{
  "category_id": 1,
  "videos": ["videoId1", "videoId2", ...]
}
```
**Response**: Success count

---

## Database Schema

### Core Tables

#### `categories`
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  table_name VARCHAR(255) NOT NULL UNIQUE,
  notion_database_id TEXT,
  notion_database_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `progress_tracker`
```sql
CREATE TABLE progress_tracker (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  category_name VARCHAR(255),
  count INTEGER DEFAULT 0,
  UNIQUE(date, category_id)
);
```

### Dynamic Category Tables

Each category gets its own table (e.g., `prompt_engineering_videos`):

```sql
CREATE TABLE {category}_videos (
  id SERIAL PRIMARY KEY,
  video_id VARCHAR(50) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  channel_name VARCHAR(255),
  channel_id VARCHAR(100),
  view_count TEXT,
  likes TEXT,
  channel_subscriber_count TEXT,
  upload_date TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration VARCHAR(20),
  commented_status VARCHAR(20) DEFAULT 'pending',
  comment_text TEXT,
  date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_commented TIMESTAMP,
  error_message TEXT
);
```

### Indexes
```sql
-- Speed up status queries
CREATE INDEX idx_{category}_commented_status ON {category}_videos(commented_status);

-- Speed up view count sorting
CREATE INDEX idx_{category}_view_count ON {category}_videos(view_count DESC);

-- Speed up progress tracking
CREATE INDEX idx_progress_date ON progress_tracker(date);
```

---

## Extension Architecture

### File Structure
```
youtube-extension/
├── manifest.json           # Extension configuration
├── popup.html             # UI interface
├── popup.js               # UI logic
├── background.js          # Service worker (main orchestrator)
├── content.js             # YouTube page interaction
├── config.js              # Configuration settings
├── styles.css             # UI styling
└── utils/
    ├── api.js             # Backend API client
    ├── notion.js          # Notion API client
    └── youtube-utils.js   # YouTube extraction utilities
```

### Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "YouTube Video Commenter",
  "version": "1.0",
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://*.railway.app/*",
    "https://api.notion.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["https://www.youtube.com/*"],
    "js": ["content.js"]
  }]
}
```

### Message Passing

```javascript
// Service Worker → Content Script
chrome.tabs.sendMessage(tabId, {
  action: 'extractTranscript'
}, (response) => {
  console.log(response.transcript);
});

// Content Script → Service Worker
chrome.runtime.sendMessage({
  action: 'transcriptExtracted',
  transcript: '...'
});

// Content Script → Popup
chrome.runtime.sendMessage({
  action: 'updateStatus',
  status: 'Processing...'
});
```

### Storage Structure

```javascript
// Chrome Storage
{
  notionSettings: {
    apiKey: 'secret_xxx',
    parentPageId: 'abc123...'
  },
  dailyProgress: {
    '2025-10-15': {
      '1': 15,  // category_id: count
      '2': 8
    }
  }
}
```

---

## Integration Details

### OpenAI Integration

#### Configuration
- **Model**: gpt-4
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 1000 (summary), 300 (comment)

#### Prompts

**Summary Prompt**:
```
Create a detailed summary of this video transcript. Include:
1. Main topics covered with timestamps
2. Key insights and takeaways
3. Important quotes or statistics
4. Overall conclusion

Format with markdown headers and bullet points.

Transcript:
{transcript}

Video Title: {title}
Channel: {channel}
```

**Comment Prompt** (Promo style):
```
Write an engaging YouTube comment for this video that:
1. Shows genuine appreciation for specific points
2. Adds value by highlighting key insights
3. Includes a natural mention of VideoSum AI
4. Keeps it conversational and authentic

Video: {title}
Summary: {summary}

Comment:
```

### YouTube Data API Integration

#### Used Endpoints
- `search.list` - Search videos by keyword
- `videos.list` - Get video details (likes, views, upload date)
- `channels.list` - Get channel subscriber count

#### Rate Limits
- 10,000 quota units per day
- Search: 100 units per request
- Videos: 1 unit per request
- Channels: 1 unit per request

#### Optimization
- Batch channel requests (up to 50 IDs per call)
- Cache results in database
- Only fetch when adding new videos

### Notion API Integration

#### API Version
- `2022-06-28` (required in header)

#### Key Endpoints
- `POST /v1/search` - Search for databases
- `POST /v1/databases` - Create new database
- `POST /v1/pages` - Create page in database

#### Character Limits
- **Text blocks**: 2000 chars max per block
- **Rich text**: 2000 chars total per rich_text array
- **Solution**: Smart chunking at natural breakpoints

#### Block Types Used
```javascript
// Embed block (YouTube video)
{
  type: 'embed',
  embed: { url: 'https://youtube.com/watch?v=...' }
}

// Heading block
{
  type: 'heading_2',
  heading_2: {
    rich_text: [{ text: { content: 'Summary' } }]
  }
}

// Paragraph block
{
  type: 'paragraph',
  paragraph: {
    rich_text: [{ text: { content: 'Text content...' } }]
  }
}

// Quote block (for comments)
{
  type: 'quote',
  quote: {
    rich_text: [{ text: { content: 'Comment text...' } }]
  }
}
```

---

## Configuration

### Backend Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/database

# OpenAI
OPENAI_API_KEY=sk-...

# YouTube
YOUTUBE_API_KEY=AIza...

# Notion
NOTION_API_KEY=secret_...
NOTION_PARENT_PAGE_ID=abc123...

# Server
PORT=3000
```

### Extension Configuration

```javascript
// config.js
const CONFIG = {
  API_BASE_URL: 'https://youtube-commenting-automation-production.up.railway.app',
  DAILY_LIMIT: 50,
  DEBUG_MODE: false
};
```

### Notion Settings (User-Configured)

Stored in Chrome Storage:
```javascript
{
  apiKey: 'secret_xxx',       // From notion.so/my-integrations
  parentPageId: 'abc123...'   // Parent page where databases are created
}
```

---

## Performance Optimizations

### Backend
- **Database Connection Pooling**: Reuses connections
- **Async Operations**: Non-blocking I/O
- **Indexed Queries**: Fast video lookups
- **Batch API Calls**: Reduces YouTube API quota usage

### Extension
- **Service Worker**: Always-on background processing
- **Message Passing**: Efficient cross-context communication
- **Local Caching**: Reduces API calls
- **Lazy Loading**: Only loads data when needed

### Notion
- **Smart Chunking**: Prevents API errors
- **Backend Persistence**: Reduces Notion searches
- **Batch Block Creation**: Single API call per page

---

## Security Considerations

### API Keys
- ✅ Stored in environment variables (backend)
- ✅ Stored in Chrome Storage (extension)
- ✅ Never logged to console (except debug mode)
- ✅ Never committed to git

### Database
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Connection string in environment only
- ✅ Railway automatic SSL

### Extension
- ✅ HTTPS-only communication
- ✅ Content Security Policy enforced
- ✅ Limited host permissions
- ✅ No inline scripts in manifest

### Notion
- ✅ User-specific API keys (not shared)
- ✅ Integration permissions scoped
- ✅ Database IDs not exposed publicly

---

## Testing Strategy

### Backend Tests
```bash
# Manual testing
curl https://your-url.railway.app/health
curl https://your-url.railway.app/api/categories
```

### Extension Tests
1. Load unpacked extension
2. Check service worker console
3. Process test video
4. Verify Notion page created
5. Check database updated

### Integration Tests
1. End-to-end video processing
2. Notion database creation
3. Cross-device database reuse
4. Error handling (no API key, network failure)
5. Long content chunking

---

## Monitoring and Debugging

### Backend Logs (Railway)
```bash
railway logs
```

### Extension Logs

**Service Worker Console**:
1. chrome://extensions
2. Click "service worker" under extension
3. View console logs

**Content Script Console**:
1. Open YouTube page
2. F12 → Console
3. Filter by "content.js"

### Database Queries
```sql
-- Check video status
SELECT video_id, title, commented_status FROM prompt_engineering_videos;

-- Check progress
SELECT * FROM progress_tracker WHERE date = CURRENT_DATE;

-- Check Notion mappings
SELECT id, name, notion_database_id FROM categories;
```

---

## Troubleshooting

### Common Issues

**"No videos in queue"**
- Check database: Videos added?
- Check status: All marked 'completed'?
- Solution: Add more videos via admin

**"Failed to save to Notion"**
- Check Notion API key valid
- Check parent page ID correct
- Check integration has permissions
- Solution: Reconfigure Notion settings

**"Comment failed to post"**
- Check YouTube page loaded
- Check comment box accessible
- Check network connection
- Solution: Retry, check console logs

**"Subscriber count not showing"**
- Check backend has data
- Check video was added via bulk-add (not manual)
- New videos will have data, old may not

---

This documentation reflects the system state at **v1.0-notion-complete** (2025-10-15).
For restore procedures, see `BACKUP_AND_RESTORE.md`.
For current state, see `SYSTEM_STATE_v1.0.md`.
