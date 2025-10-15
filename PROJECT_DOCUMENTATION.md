# YouTube Commenting Automation - Complete Project Documentation

**Last Updated:** October 15, 2025
**Project Status:** Production Ready
**Version:** 2.0 (Major Prompt Overhaul)

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Backend Features](#backend-features)
4. [Chrome Extension Features](#chrome-extension-features)
5. [Database Schema](#database-schema)
6. [AI & Prompting System](#ai--prompting-system)
7. [Key Technical Implementations](#key-technical-implementations)
8. [Recent Major Updates](#recent-major-updates)
9. [Technical Learnings](#technical-learnings)
10. [Deployment & Configuration](#deployment--configuration)

---

## Project Overview

### Purpose
Automated system for generating high-quality, educational YouTube comments using AI. The system extracts video transcripts, generates intelligent summaries/chapters/takeaways, and posts them as comments while saving detailed summaries to Notion for knowledge management.

### Tech Stack
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (Railway)
- **AI Service:** OpenRouter (Google Gemini Flash 2.5-8B)
- **Frontend:** Chrome Extension (Manifest V3)
- **Knowledge Base:** Notion API Integration
- **Hosting:** Railway (auto-deploy from GitHub)

### Project Structure
```
yt-commenting-project/
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic (AI, Notion)
│   │   ├── utils/             # Helpers, prompt templates
│   │   └── server.js          # Express app entry point
│   └── package.json
├── youtube-extension/          # Chrome extension
│   ├── background.js          # Service worker (main logic)
│   ├── content.js             # YouTube page interaction
│   ├── popup/                 # Extension UI
│   ├── utils/                 # YouTube utilities, API client
│   └── manifest.json
├── database/                   # SQL schemas
└── admin/                      # Admin web interface
```

---

## System Architecture

### High-Level Flow
```
User clicks "Next Video"
    ↓
Extension fetches random video from backend
    ↓
Opens YouTube video page
    ↓
Checks login status
    ↓
Checks if transcript exists
    ↓
Extracts transcript from YouTube
    ↓
Gets video metadata (title, channel, views, etc.)
    ↓
**NEW** Checks description for chapter timestamps (0:00)
    ↓
Determines comment type (chapters/summary/takeaways)
    ↓
Sends to backend API for AI processing
    ↓
Backend generates content using OpenRouter
    ↓
**NEW** Strips markdown from YouTube comment
    ↓
Adds promo text (randomly top/bottom, 100% default)
    ↓
Fills comment box on YouTube
    ↓
Saves full summary to Notion
    ↓
Updates video status in database
    ↓
Increments daily progress counters
```

### Component Communication
```
Chrome Extension (Client)
    ↕ HTTP REST API
Backend Server (Railway)
    ↕ PostgreSQL Queries
Database (Railway PostgreSQL)

    ↕ HTTP API Calls
OpenRouter (AI Service)

    ↕ Notion API
Notion Database (Knowledge Base)
```

---

## Backend Features

### API Endpoints

#### Video Management
- **GET `/api/videos/next`** - Get next unprocessed video for category
- **POST `/api/videos`** - Bulk add videos to category
- **PUT `/api/videos/:id/status`** - Update video processing status
- **GET `/api/videos/search`** - Search videos in database

#### AI Processing
- **POST `/api/ai/process`** - Complete processing (transcript → AI → comment)
  - Accepts: `transcript`, `metadata`, `comment_type` (optional)
  - Returns: `summary` (for Notion), `comment` (for YouTube), `comment_type`
  - **Smart Type Selection:** Uses provided type or randomizes intelligently
- **POST `/api/ai/summarize`** - Generate summary only
- **POST `/api/ai/chapters`** - Generate chapter breakdown only
- **POST `/api/ai/takeaways`** - Generate key takeaways only
- **POST `/api/ai/comment`** - DEPRECATED (Step 2 removed)

#### Category Management
- **GET `/api/categories`** - List all categories with stats
- **POST `/api/categories`** - Create new category
- **GET `/api/categories/:id/videos`** - Get videos in category
- **DELETE `/api/categories/:id`** - Delete category

#### Progress Tracking
- **GET `/api/progress/daily`** - Get daily progress stats
- **POST `/api/progress/increment`** - Auto-increment on comment (used internally)

#### Admin Interface
- **GET `/admin`** - Admin dashboard (static HTML)
- **GET `/admin/analytics`** - Analytics page with charts
- **GET `/admin/categories`** - Category management UI
- **GET `/admin/videos`** - Video search interface

### Backend Services

#### OpenRouter Service (`services/openrouter-service.js`)
- **Model:** `google/gemini-2.5-flash` (fast, cost-effective)
- **Methods:**
  - `generateSummary()` - Rich, detailed educational summary
  - `generateChapters()` - Chapter breakdown with timestamps
  - `generateTakeaways()` - Key insights with explanations
  - `generateComment()` - **REMOVED** (no longer converts to short comments)
- **Chunking:** Handles long videos (10k character chunks)
- **Combination:** Merges multi-chunk summaries seamlessly

#### Notion Integration Service (`services/notion-service.js`)
- **Database Creation:** Auto-creates Notion database on first use
- **Page Properties:**
  - Title (video title)
  - URL (YouTube link)
  - Channel (text)
  - Summary (rich text, markdown formatted)
  - Comment (rich text)
  - Comment Type (select: summary/chapters/takeaways)
  - Processed Date (date)
  - View Count (number)
  - Category (relation to categories database)

---

## Chrome Extension Features

### Manifest V3 Architecture
- **Service Worker:** `background.js` (persistent logic)
- **Content Script:** `content.js` (YouTube DOM interaction)
- **Popup UI:** `popup.html` + `popup.js` (user interface)
- **Permissions:** `activeTab`, `storage`, `notifications`, `scripting`

### Core Features

#### 1. Video Processing Workflow
**Location:** `background.js` → `processVideoInTab()`

**Steps:**
1. Check YouTube login status (multi-method detection)
2. Check if transcript available (robust 8s wait + 5 retries)
3. Extract full transcript with timestamps
4. Get enhanced video metadata (via injected MetadataExtractor)
5. **NEW** Check description for chapters (0:00 detection)
6. Send to backend for AI processing
7. **NEW** Strip markdown from comment (remove `**bold**`, `*italic*`)
8. Add promo text (100% default, random top/bottom position)
9. Fill YouTube comment box (with retry logic)
10. Save to Notion (if configured)
11. Update database status
12. Increment progress counters

#### 2. Smart Chapter Detection
**Location:** `youtube-extension/utils/youtube.js` → `hasChaptersInDescription()`

**Logic:**
- Waits 8 seconds for page load
- Expands description ("Show more" button)
- Searches for `0:00` or `00:00` using regex `/\b0?0:00\b/`
- 5 retry attempts with 1-second delays
- **Decision Making:**
  - **IF chapters found** → Force `comment_type = 'chapters'`
  - **IF no chapters** → Randomize between `'summary'` and `'takeaways'` (50/50)

**Benefits:**
- Avoids duplicate chapters when creator already provided them
- More valuable comments (chapters only when missing)
- Respects creator's work

#### 3. No Transcript Auto-Skip
**Location:** `background.js` → Error handling in `processVideoInTab()`

**Behavior:**
- Detects when video has no transcript
- Marks video as "No Transcript Available" in database
- Automatically fetches next video after 2 seconds
- Shows notification: "No Transcript - Skipping"
- **Fail-Safe:** Timeout/error also triggers skip

**Trigger Conditions:**
- `hasTranscript()` returns false
- `getTranscript()` returns null/empty
- Transcript check times out (25 seconds)

#### 4. YouTube DOM Utilities
**Location:** `youtube-extension/utils/youtube.js`

**Key Functions:**
- `hasTranscript()` - Robust transcript detection (8s wait, 5 retries)
- `getTranscript()` - Extract transcript segments with timestamps
- `hasChaptersInDescription()` - **NEW** Detect chapter timestamps in description
- `fillCommentBox()` - Auto-fill comment with retry logic
- `isLoggedIn()` - Multi-method login detection (7 methods)
- `getVideoMetadata()` - Enhanced metadata extraction

**Retry & Wait Strategy:**
- All functions use proper wait times for page load
- Multiple detection methods for reliability
- Fail-safe defaults (timeout = false)

#### 5. Promo Text Management
**Location:** `background.js` → Promo settings

**Default Promos:**
- "This summary was generated with VideoSum AI"
- "Generated chapter breakdown using www.videosum.ai"
- "Want to summarize other videos? Search for VideoSum AI on Google"
- "This breakdown was created by VideoSum - AI-powered video analysis"

**Behavior:**
- **Default:** 100% of comments get promo (changed from 70%)
- **Position:** Randomly top or bottom (50/50)
- **Settings:**
  - `promoEnabled` (default: true)
  - `promoAllowNone` (default: false - always add promo)
  - `promoTexts` (custom array)

#### 6. Storage Management
**Location:** `youtube-extension/utils/storage.js`

**Stored Data:**
- Daily progress counter (resets at midnight)
- Processing state (prevents concurrent processing)
- Backend URL configuration
- Promo settings
- Notion configuration

---

## Database Schema

### Tables

#### `categories`
```sql
CREATE TABLE categories (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) UNIQUE NOT NULL,
  search_query TEXT NOT NULL,
  min_view_count INTEGER DEFAULT 100000,
  max_results INTEGER DEFAULT 50,
  upload_days INTEGER DEFAULT 730,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `processed_videos`
```sql
CREATE TABLE processed_videos (
  video_id VARCHAR(50) PRIMARY KEY,
  category_id INTEGER REFERENCES categories(category_id),
  url TEXT NOT NULL,
  title TEXT,
  channel_name VARCHAR(255),
  view_count INTEGER,
  summary_text TEXT,
  comment_text TEXT,
  comment_type VARCHAR(50),
  promo_text TEXT,
  promo_position VARCHAR(10),
  notion_page_id VARCHAR(100),
  summary_status VARCHAR(50) DEFAULT 'pending',
  commented_status VARCHAR(50) DEFAULT 'pending',
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `daily_progress`
```sql
CREATE TABLE daily_progress (
  date DATE PRIMARY KEY,
  category_id INTEGER REFERENCES categories(category_id),
  category_name VARCHAR(255),
  videos_processed INTEGER DEFAULT 0,
  comments_posted INTEGER DEFAULT 0
);
```

---

## AI & Prompting System

### Prompt Engineering Philosophy

**v2.0 Major Overhaul** - October 15, 2025

#### Design Principles
1. **Educational Depth:** Rich, detailed explanations for learning
2. **Human-Like Writing:** Third person, natural language, Grade 10-12 level
3. **Professional Tone:** "This video covers..." not "The video covers..."
4. **No AI Words:** Avoid "delve", "leverage", "moreover", "comprehensive", "robust"
5. **Clean Formatting:** No `**bold**` or `*italic*` markdown in YouTube comments
6. **Timestamp Format:** Plain `0:00` not `[0:00]`
7. **No Meta-Commentary:** Never output "Here's a summary" or preambles

### Content Types

#### 1. Summary (`getSummaryPrompt`)
**Purpose:** Comprehensive educational breakdown of entire video

**Structure:**
- Section headers: `## Key Points`, `## Main Takeaways`
- Bullet points with timestamps: `- 1:23 Point description`
- Numbered lists where appropriate
- Simple emojis sparingly: ✓, →, ⏰, 📌

**Content Depth:**
- Cover ALL important points (no limits)
- 2-4 sentences per point with FULL context
- Include definitions, examples, reasoning
- Explain WHY and HOW (not just WHAT)
- Never sacrifice depth for brevity

**Use Cases:**
- Educational videos
- Tutorials without chapters
- Long-form discussions
- When video has no chapters in description

#### 2. Chapters (`getChaptersPrompt`)
**Purpose:** Create chapter breakdown with timestamps and descriptions

**Format:**
```
This video covers these chapters:

0:00 Introduction
The creator welcomes viewers and outlines what will be covered...

1:23 Main Topic Name
Detailed 2-3 sentence description of what's covered in this section...

5:45 Next Section
...
```

**Content Depth:**
- ALL meaningful chapters (no limits)
- 2-3 sentence descriptions per chapter
- Start with 0:00 (Introduction)
- Covers entire video start to finish

**Use Cases:**
- Videos that DON'T have chapters in description
- How-to videos (chapter per step)
- Listicles (chapter per item)

#### 3. Takeaways (`getTakeawaysPrompt`)
**Purpose:** Key insights and actionable lessons

**Format:**
```
This video covers these key takeaways:

1. (0:35) Main takeaway title - Detailed 2-4 sentence explanation with full context, reasoning, examples, and actionable guidance on WHY this matters and HOW to apply it.

2. (2:15) Second takeaway...
```

**Content Depth:**
- ALL important takeaways (no limits)
- 2-4 sentences per takeaway
- Focus on actionable insights
- Explain WHY it matters and HOW to apply it

**Use Cases:**
- Educational content
- Skill-building videos
- When video has chapters (avoids duplication)

### Markdown Stripping

**Location:** `backend/src/routes/ai.js` → `stripMarkdownForYouTube()`

**Removes:**
- `**bold**` → bold
- `*italic*` → italic
- `_italic_` → italic
- `__bold__` → bold

**Keeps for Notion:**
- Full markdown in `summary` field
- Clean text in `comment` field for YouTube

### Prompt Templates Location
**File:** `backend/src/utils/prompt-templates.js`

**Functions:**
- `getSummaryPrompt(videoInfo, transcript, isChunk)`
- `getChaptersPrompt(videoInfo, transcript)`
- `getTakeawaysPrompt(videoInfo, transcript)`
- `getCombinePrompt(chunkSummaries, videoInfo)` - For long videos

---

## Key Technical Implementations

### 1. Transcript Chunking for Long Videos

**Problem:** OpenRouter has token limits, long videos exceed them

**Solution:** Split transcript into 10,000 character chunks
```javascript
// Process each chunk separately
chunks.forEach(chunk => {
  const chunkSummary = await ai.generateSummary(chunk, metadata, isChunk=true);
  chunkSummaries.push(chunkSummary);
});

// Combine all chunks into one seamless summary
const finalSummary = await ai.combineSummaries(chunkSummaries, metadata);
```

**Combination Prompt:** Removes chunk references, organizes by topic/theme, maintains all timestamps

### 2. Retry Logic with Exponential Backoff

**Location:** Multiple places (message sending, API calls)

**Pattern:**
```javascript
async function sendMessageWithRetry(tabId, message, maxRetries = 3, timeout = 10000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      );
      const messagePromise = chrome.tabs.sendMessage(tabId, message);
      return await Promise.race([messagePromise, timeoutPromise]);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await wait(1000 * attempt); // Exponential backoff
    }
  }
}
```

**Used For:**
- Content script communication
- Transcript extraction
- Metadata fetching
- Comment box filling

### 3. Content Script Injection & Readiness

**Problem:** Content scripts may not be ready when background tries to communicate

**Solution:** Ping-based readiness check
```javascript
async function waitForContentScript(tabId, maxAttempts = 30, delayMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return true; // Content script is ready
    } catch (error) {
      await wait(delayMs);
    }
  }
  throw new Error('Content script did not load in time');
}
```

**Total Wait Time:** Up to 15 seconds (30 attempts × 500ms)

### 4. Multi-Method Login Detection

**Challenge:** YouTube DOM structure varies, no single reliable method

**Solution:** Try 7 different detection methods
```javascript
// Method 1: Avatar button
const avatarButton = document.querySelector('button#avatar-btn');

// Method 2: Topbar menu button renderer
const ytdTopbar = document.querySelector('ytd-topbar-menu-button-renderer#avatar-btn');

// Method 3: Account icon with aria-label
const accountIcon = document.querySelector('button[aria-label*="Account"]');

// Method 4: User avatar image from Google
const avatarImgs = document.querySelectorAll('ytd-masthead img');
// Check if src includes 'googleusercontent.com'

// Method 5: Any topbar button
const anyTopbarButton = document.querySelector('ytd-topbar-menu-button-renderer');

// Method 6: Sign in button (negative check - if exists, NOT logged in)
const signInButton = document.querySelector('a[href*="accounts.google.com/ServiceLogin"]');

// Method 7: Guide renderer (sidebar, only when logged in)
const guideRenderer = document.querySelector('ytd-guide-renderer');
```

**Returns:** `true`, `false`, or `null` (page not loaded yet - retry)

### 5. Smart Comment Type Selection Logic

**Decision Tree:**
```
Video loaded
    ↓
Check description for "0:00" or "00:00"
    ↓
Found? ──YES─→ commentType = 'chapters'
    ↓
    NO
    ↓
Randomize: ['summary', 'takeaways']
    ↓
50% → 'summary'
50% → 'takeaways'
```

**Implementation:**
```javascript
const chaptersCheck = await YouTubeUtils.hasChaptersInDescription();
if (chaptersCheck) {
  commentType = 'chapters';
} else {
  const types = ['summary', 'takeaways'];
  commentType = types[Math.floor(Math.random() * types.length)];
}
```

### 6. Database Connection Pooling

**Location:** `backend/src/db.js`

**Configuration:**
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Railway
  },
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

**Usage Pattern:**
```javascript
const client = await pool.connect();
try {
  const result = await client.query('SELECT * FROM ...');
  return result.rows;
} finally {
  client.release(); // Always release back to pool
}
```

---

## Recent Major Updates

### Session Summary - October 15, 2025

#### 1. AI Prompt Overhaul (Commits: 6208de5, 741ebb3)
**Major Changes:**
- Eliminated conversion step (Step 2) - post full content directly
- Removed all artificial limits (bullets, chapters, takeaways counts)
- Added human writing style requirements (third person, simple English)
- Banned AI-sounding words (delve, leverage, comprehensive, etc.)
- Emphasized content depth: "NEVER sacrifice depth for brevity"
- Professional language: "this video" not "the video"
- No meta-commentary: removed preambles like "Here's a summary"

**Impact:** Comments are now rich, educational, natural-sounding

#### 2. Markdown Stripping (Commit: 84cc8ad)
**Problem:** `**bold**` and `*italic*` look ugly in YouTube comments

**Solution:**
- Added `stripMarkdownForYouTube()` function
- Strips markdown from `comment` field before posting
- Keeps markdown in `summary` field for Notion
- Result: Clean YouTube comments, formatted Notion pages

#### 3. Timestamp Format Change (Commit: a913024)
**Before:** `[0:00]`, `[1:23]`
**After:** `0:00`, `1:23`

**Reason:** Cleaner look, more professional

#### 4. Smart Chapter Detection (Commit: b3a547c)
**Feature:** Intelligent comment type selection based on video description

**Implementation:**
- New function: `hasChaptersInDescription()`
- Checks description for `0:00` or `00:00`
- If found → Force 'chapters' type
- If not found → Randomize 'summary'/'takeaways'

**Benefits:**
- Avoids duplicate chapters
- More valuable comments
- Respects creator's work

#### 5. Promo Always On (Commit: 7dbb333)
**Before:** 70% had promo, 30% skipped
**After:** 100% have promo by default

**Change:** `promoAllowNone` default from `true` to `false`

#### 6. No Transcript Auto-Skip (Previous session)
**Feature:** Automatically skip videos without transcripts

**Flow:**
1. Detect no transcript
2. Mark as "No Transcript Available"
3. Auto-fetch next video after 2s
4. Show notification

**Triggers:**
- `hasTranscript()` returns false
- `getTranscript()` returns null
- Timeout after 25 seconds

#### 7. Enhanced Transcript Detection (Previous session)
**Improvements:**
- Wait up to 8 seconds for main content load
- Wait 2 seconds for description area
- 5 retry attempts with 1-second delays
- Fail-safe: timeout = no transcript

#### 8. Railway Deployment Fixes
**Issues Resolved:**
- Backend not updating (was deploying to `master`, needed `main`)
- Added `railway.toml` and `nixpacks.toml` for proper builds
- Changed from `npm ci` to `npm install` (package-lock.json gitignored)

**Current Setup:**
- Auto-deploy from GitHub `main` branch
- Node.js 20 via Nixpacks
- Build: `cd backend && npm install`
- Start: `cd backend && npm start`

---

## Technical Learnings

### 1. Chrome Extension Development

#### Manifest V3 vs V2
- **V3 Changes:**
  - Background pages → Service workers (no persistent DOM)
  - `chrome.extension.sendMessage` → `chrome.runtime.sendMessage`
  - Different lifecycle management

#### Content Script Communication
- **Challenge:** Service worker can't directly access page DOM
- **Solution:** Content script acts as bridge
- **Pattern:**
  ```javascript
  // Background → Content Script
  chrome.tabs.sendMessage(tabId, { action: 'extractTranscript' });

  // Content Script → YouTube DOM
  const transcript = await YouTubeUtils.getTranscript();

  // Content Script → Background
  sendResponse({ success: true, transcript });
  ```

#### Async Message Handling
- **Must return `true`** from listener for async responses
- **Must call `sendResponse()`** exactly once
- **Race conditions:** Use `responseSent` flag

#### Storage API
- Use `chrome.storage.local` (not localStorage in service worker)
- Max 5MB storage per extension
- Async API (Promise-based)

### 2. YouTube DOM Interaction

#### Page Load Detection
- YouTube is a SPA (Single Page Application)
- Page navigation doesn't trigger full reload
- Must wait for specific elements to appear
- **Best Practice:** Poll with timeout

#### Description Expansion
- Description often collapsed on load
- Must click "Show more" button
- Selector: `tp-yt-paper-button#expand`
- Wait after click for expansion

#### Transcript Panel
- Transcript not always visible
- Multiple ways to access:
  1. Button in description
  2. Three-dot menu → Show transcript
  3. Direct panel check
- Must handle all cases

#### Comment Box Auto-Fill
- Comment box loads lazily (scroll into view triggers load)
- Must scroll to comments section first
- Wait for `#placeholder-area` to appear
- Click to activate, then find `#contenteditable-root`
- Trigger `input` event after setting text

### 3. AI Prompt Engineering

#### Lessons Learned

**1. Be Explicit About Format**
- Bad: "Create a summary"
- Good: "Output ONLY the summary content itself - no preamble, no meta-commentary"

**2. Emphasize Depth**
- Adding "NEVER sacrifice depth for brevity" increased content quality
- "2-4 sentences with FULL CONTEXT" better than "brief explanation"

**3. Ban Problematic Words**
- List specific words to avoid: "delve", "leverage", etc.
- AI follows explicit bans better than "sound natural"

**4. Professional Language**
- "This video covers..." sounds better than "The video covers..."
- Direct specification in prompt ensures consistency

**5. Formatting Instructions**
- Must specify exactly: `## Headers`, `- bullets`, `1. numbered`
- "NO **bold** OR *italic* MARKDOWN" more effective than "keep it simple"

**6. Chunking Strategy**
- Long videos need chunking (10k characters)
- Must tell AI each chunk is "part of larger context"
- Combination prompt must remove chunk references
- Organize by theme, not chunk order

### 4. PostgreSQL on Railway

#### Connection Pooling
- Always use connection pools (not individual connections)
- Release connections in `finally` blocks
- Set `max` pool size based on expected load

#### SSL Configuration
- Railway requires SSL
- Must set `rejectUnauthorized: false` for Railway
- Connection string includes SSL params

#### Query Parameterization
- Always use parameterized queries: `$1`, `$2`
- Never concatenate user input into SQL
- Prevents SQL injection

#### Date Handling
- Use `CURRENT_TIMESTAMP` for server-side dates
- Be aware of timezone issues (Railway uses UTC)
- Convert to local timezone in application if needed

### 5. Error Handling Best Practices

#### Always Fail Gracefully
```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  return fallbackValue; // Don't crash entire process
}
```

#### Timeout All Async Operations
```javascript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout')), 10000)
);
const result = await Promise.race([operation(), timeoutPromise]);
```

#### Provide User Feedback
- Show notifications for errors
- Log detailed errors for debugging
- Give actionable error messages
- Don't leave user wondering what happened

### 6. Notion API Integration

#### Database Setup
- Must create database first (via API or manually)
- Get database ID from URL: `notion.so/{database_id}?v=...`
- API requires integration to be added to database

#### Property Types
- **Title:** One per database (required)
- **Rich Text:** Supports markdown
- **Select:** Pre-defined options
- **Date:** ISO format
- **URL:** Validates URLs
- **Number:** Integers or decimals

#### Rate Limiting
- Notion has rate limits (3 requests/second)
- Implement retry with exponential backoff
- Consider queuing for high-volume operations

### 7. Railway Deployment

#### Git Integration
- Railway auto-deploys from GitHub
- Must push to correct branch (`main` not `master`)
- Check Railway dashboard for branch configuration

#### Build Configuration
- `railway.toml` for Railway-specific config
- `nixpacks.toml` for build process
- Specify build and start commands explicitly

#### Environment Variables
- Set in Railway dashboard
- Access via `process.env.VARIABLE_NAME`
- Never commit secrets to git

#### Logs & Debugging
- Use `railway logs` command
- Check for startup errors
- Verify correct commit is deployed

---

## Deployment & Configuration

### Backend Deployment (Railway)

#### Environment Variables Required
```bash
# Database
DATABASE_URL=postgresql://...  # Provided by Railway

# AI Service
OPENROUTER_API_KEY=sk-or-v1-...
DEFAULT_AI_MODEL=google/gemini-2.5-flash
DEFAULT_MAX_TOKENS=4096
DEFAULT_CHUNK_SIZE=10000

# YouTube API (for admin search)
YOUTUBE_API_KEY=AIza...

# Notion Integration
NOTION_API_KEY=ntn_...  # User provides in extension

# Server Config
NODE_ENV=production
CORS_ORIGIN=*  # Or specific domain
```

#### Deployment Commands
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Check status
railway status

# View logs
railway logs

# Redeploy
railway redeploy --yes

# Set environment variable
railway variables set KEY=value
```

#### Build Configuration Files

**`railway.toml`:**
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "cd backend && npm start"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

**`nixpacks.toml`:**
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["cd backend && npm install"]

[phases.build]
cmds = ["echo 'No build step needed'"]

[start]
cmd = "cd backend && npm start"
```

### Chrome Extension Installation

#### Development Mode
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `youtube-extension/` folder
5. Extension appears in toolbar

#### After Code Changes
- Click refresh icon on extension card
- Or toggle extension off/on
- Background service worker restarts

#### Configuration
1. Click extension icon
2. Set backend URL: `https://youtube-commenting-automation-production.up.railway.app`
3. Configure Notion (optional):
   - API Key: Get from notion.so/my-integrations
   - Database ID: From Notion database URL
4. Set promo texts (optional)

### Database Setup

#### Initialize Tables
```bash
# From project root
psql $DATABASE_URL < database/schema.sql
```

#### Manual Table Creation (if needed)
See SQL in Database Schema section above

#### Backup Database
```bash
# Export
pg_dump $DATABASE_URL > backup.sql

# Import
psql $DATABASE_URL < backup.sql
```

### Notion Setup

#### Create Integration
1. Go to notion.so/my-integrations
2. Click "New integration"
3. Name it (e.g., "YouTube Commenter")
4. Copy API key

#### Create Database
1. Create new Notion page
2. Add database (table view)
3. Share with integration (click Share → Add integration)
4. Copy database ID from URL

#### Configure in Extension
1. Paste API key in extension settings
2. Paste database ID
3. Test connection by processing a video

---

## Future Enhancements

### Potential Features
1. **Custom Prompt Templates** - Let users edit prompts
2. **Multiple AI Models** - Support Claude, GPT-4, etc.
3. **Scheduled Processing** - Auto-process at specific times
4. **Bulk Video Import** - CSV upload of video URLs
5. **Comment Analytics** - Track engagement (likes, replies)
6. **A/B Testing** - Test different comment styles
7. **Multi-Language Support** - Translate summaries
8. **Voice-Over Detection** - Handle non-English content
9. **Thumbnail Analysis** - Visual context for summaries
10. **Chrome Extension Store** - Publish for public use

### Known Limitations
1. Requires manual comment submission (YouTube restriction)
2. Only works on videos with transcripts
3. Limited to Google login (not email/password)
4. Single category processing at a time
5. No mobile app (Chrome extension only)

### Performance Optimizations
1. Cache transcript extractions
2. Batch database updates
3. Compress Notion API payloads
4. Implement request queuing
5. Add Redis for session management

---

## Support & Maintenance

### Debugging Tips

#### Extension Not Working
1. Check console logs (right-click extension → Inspect)
2. Check content script logs (F12 on YouTube page)
3. Verify backend URL in settings
4. Reload extension

#### Backend Errors
1. Check Railway logs: `railway logs`
2. Verify environment variables set
3. Check database connection
4. Test API endpoints with curl

#### Database Issues
1. Verify connection string
2. Check table existence: `\dt` in psql
3. Verify user permissions
4. Check for column mismatches

### Monitoring

#### Health Checks
- **Backend:** GET `/health` → `{"status":"healthy"}`
- **Database:** Included in health check response

#### Key Metrics
- Videos processed per day
- Comment success rate
- AI API response time
- Transcript extraction success rate
- Average processing time per video

---

## Credits & Acknowledgments

**Developer:** Built with Claude Code (Anthropic)
**AI Service:** OpenRouter (Google Gemini Flash 2.5-8B)
**Hosting:** Railway
**Knowledge Base:** Notion API

---

**End of Documentation**

*This document is maintained as the project evolves. Last major update: October 15, 2025*
