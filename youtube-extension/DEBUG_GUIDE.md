# Extension Debugging Guide

This guide helps you debug issues with the YouTube Commenter Extension.

---

## How to Access Console Logs

### 1. **Background Service Worker Logs**
- Go to `chrome://extensions/`
- Find "YouTube Video Commenter Automation"
- Click **"Inspect views: service worker"**
- Console opens with all background script logs
- **Look for tags**: `[STEP X/8]`, `[DATABASE]`, `[NOTION]`, `[API]`

### 2. **Content Script Logs (YouTube Page)**
- Open a YouTube video page
- Press `F12` (or right-click → Inspect)
- Go to **Console** tab
- **Look for tags**: `[CONTENT]`, `YouTubeUtils`

### 3. **Popup Logs**
- Right-click extension icon in toolbar
- Select **"Inspect"**
- Console opens with popup logs
- **Look for tags**: `[INFO]`, `[ERROR]`

---

## Understanding Log Tags

All logs are prefixed with tags to help you identify where issues occur:

| Tag | Location | Purpose |
|-----|----------|---------|
| `[STEP X/8]` | Background | Shows current processing step |
| `[CONTENT]` | Content script | YouTube page interactions |
| `[API]` | API utility | Backend communication |
| `[DATABASE]` | Background | Database update operations |
| `[NOTION]` | Background | Notion integration |
| `[NOTIFICATION]` | Background | User notifications |
| `[PROGRESS]` | Background | Progress tracking |
| `[INFO]` / `[ERROR]` | Popup | Popup UI events |

---

## Common Errors & Solutions

### ❌ Error: "Could not establish connection. Receiving end does not exist"

**Cause**: Content script not loaded on YouTube page

**Solution**:
1. Check background worker console
2. Look for: `Waiting for content script... attempt X/20`
3. If it reaches 20 attempts:
   - Refresh YouTube page manually
   - Reload extension at `chrome://extensions/`
   - Check if content script is injected (look for `[CONTENT]` logs in page console)

**Debug Steps**:
```
1. Open background worker console
2. Look for: "Waiting for page to load and content script to initialize..."
3. Should see: "Content script is ready" within 10 seconds
4. If timeout, check content script console for errors
```

---

### ❌ Error: "No transcript available for this video"

**Cause**: Video doesn't have YouTube captions/transcript

**Solution**:
1. Manually check if video has transcript:
   - Click "..." (three dots) below video
   - Look for "Show transcript" option
2. If no transcript exists, extension will skip video automatically
3. Click "Next Video" to try another one

**Debug Steps**:
```
Background Console:
[STEP 2/8] Checking if transcript is available...
❌ No transcript available, skipping video
```

---

### ❌ Error: "Please log in to YouTube first"

**Cause**: User not logged into YouTube account

**Solution**:
1. Open YouTube.com in a new tab
2. Log in to your YouTube account
3. Return to extension and try again

**Debug Steps**:
```
Background Console:
[STEP 1/8] Checking YouTube login status...
Login check response: { success: true, isLoggedIn: false }
```

---

### ❌ Error: "AI processing failed"

**Cause**: Backend AI processing encountered an error

**Solution**:
1. Check backend logs on Railway
2. Verify OpenRouter API key is set
3. Check if backend is running

**Debug Steps**:
```
Background Console:
[STEP 5/8] Processing with AI...
[API] POST request to: https://youtube-commenting-automation-production.up.railway.app/api/ai/process
[API] ❌ POST Error: HTTP 500: Internal Server Error

Next Steps:
- Check Railway logs for backend errors
- Verify OPENROUTER_API_KEY is set
- Test backend health: /health endpoint
```

---

### ❌ Error: "Failed to extract transcript"

**Cause**: YouTube DOM changed or transcript panel didn't open

**Solution**:
1. Manually open transcript panel on video page
2. Check if it opens successfully
3. If not, video might not support transcripts

**Debug Steps**:
```
Content Console:
[CONTENT] Starting transcript extraction...
[CONTENT] ❌ Error extracting transcript: Could not open transcript panel

Try:
1. Refresh page
2. Try different video
3. Check if YouTube changed their DOM structure
```

---

### ❌ Error: "Failed to fill comment box"

**Cause**: Comment box not found or YouTube DOM changed

**Solution**:
1. Scroll down to comments section manually
2. Check if comment box is visible
3. YouTube may have changed their comment box structure

**Debug Steps**:
```
Content Console:
[CONTENT] Starting comment box fill...
[CONTENT] ❌ Error filling comment: Cannot find comment box

Check:
1. Is comment section visible?
2. Are comments disabled on this video?
3. YouTube DOM structure changed?
```

---

## Debugging Workflow Step-by-Step

When you encounter an error, follow this workflow:

### Step 1: Identify Which Component Failed
```
1. Open ALL three consoles:
   - Background worker
   - Content script (YouTube page)
   - Popup (if needed)

2. Click "Next Video"

3. Watch for the last successful [STEP X/8] message
   - This tells you exactly where it failed
```

### Step 2: Read the Error Details
```
Every error logs:
✅ Error type: error.name
✅ Error message: error.message
✅ Error stack: error.stack

Example:
=== ❌ VIDEO PROCESSING FAILED ===
Error type: Error
Error message: Failed to extract transcript: Could not open transcript panel
Error stack: Error: Failed to extract transcript...
    at handleExtractTranscript (content.js:63)
    ...
```

### Step 3: Check Related Logs
```
Look for related [TAG] messages before the error:

Example for transcript extraction error:
[STEP 3/8] Extracting transcript...
[CONTENT] Starting transcript extraction...
[CONTENT] Opening transcript panel...
[CONTENT] ❌ Error: Could not find transcript button
```

### Step 4: Verify Prerequisites
```
For each step, verify its requirements:

STEP 1: Login Check
- Are you logged in to YouTube?

STEP 2: Transcript Check
- Does video have captions/transcript?

STEP 3: Extract Transcript
- Can transcript panel be opened manually?

STEP 5: AI Processing
- Is backend running? (check /health)
- Is OpenRouter API key set?

STEP 8: Fill Comment
- Is comment section visible?
- Are comments enabled?
```

---

## Testing Checklist

Before reporting an issue, verify:

### ✅ Extension Setup
- [ ] Extension loaded at `chrome://extensions/`
- [ ] No errors shown on extension card
- [ ] Extension icon visible in toolbar
- [ ] Service worker status: "Active"

### ✅ Backend Connection
- [ ] Backend health check passes: `https://youtube-commenting-automation-production.up.railway.app/health`
- [ ] Categories load in popup
- [ ] Backend logs accessible on Railway

### ✅ YouTube Page
- [ ] Logged into YouTube account
- [ ] On a video page (`/watch?v=...`)
- [ ] Video has transcript/captions available
- [ ] Comments are enabled on video

### ✅ Browser Console
- [ ] Background worker console open
- [ ] YouTube page console open (F12)
- [ ] No browser extension conflicts

---

## Advanced Debugging

### Enable Verbose Logging

All logs are already comprehensive. To trace a specific function:

1. **Background Script**: Look for `=== STARTING VIDEO PROCESSING ===`
2. **Content Script**: Look for `[CONTENT]` prefix on all operations
3. **API Calls**: Look for `[API]` prefix with request/response details

### Inspect Network Requests

1. Open DevTools → **Network** tab
2. Filter by: `youtube-commenting-automation-production.up.railway.app`
3. Click "Next Video"
4. Check each request:
   - `/api/videos/next` - Should return video object
   - `/api/ai/process` - Should return summary + comment
   - `/api/videos/update-status` - Should return success

### Check Chrome Storage

```javascript
// Run in background worker console or popup console:
chrome.storage.local.get(null, (data) => {
  console.log('Extension storage:', data);
});

// Expected data:
{
  dailyProgress: 0,
  lastResetDate: "2025-01-15",
  selectedCategory: 1,
  isProcessing: false,
  notionApiKey: "secret_...",  // if configured
  notionDatabases: {...}        // if configured
}
```

---

## Getting Help

If you still can't solve the issue:

1. **Copy all console logs** from:
   - Background worker
   - Content script (YouTube page)
   - Popup (if relevant)

2. **Include this information**:
   - Chrome version: `chrome://version/`
   - Extension version: Check `manifest.json`
   - Video URL that failed
   - Exact error message
   - Steps to reproduce

3. **Check if backend is the issue**:
   ```bash
   # Test backend directly
   curl https://youtube-commenting-automation-production.up.railway.app/health

   # Should return:
   {"status":"healthy","database":"connected"}
   ```

---

## Quick Reference: Log Flow

**Successful Processing Flow:**
```
[POPUP] User clicks "Next Video"
  ↓
[BACKGROUND] GET /api/videos/next
  ↓
[BACKGROUND] Opening video in tab
  ↓
[BACKGROUND] Waiting for content script (ping attempts)
  ↓
[CONTENT] Ping received, content script ready ✅
  ↓
[BACKGROUND] [STEP 1/8] Checking login...
[CONTENT] Login status: true ✅
  ↓
[BACKGROUND] [STEP 2/8] Checking transcript...
[CONTENT] Transcript available: true ✅
  ↓
[BACKGROUND] [STEP 3/8] Extracting transcript...
[CONTENT] Transcript extracted: 15234 characters ✅
  ↓
[BACKGROUND] [STEP 4/8] Getting metadata...
[CONTENT] Metadata extracted ✅
  ↓
[BACKGROUND] [STEP 5/8] Processing with AI...
[API] POST /api/ai/process
[API] Response: {summary, comment, comment_type} ✅
  ↓
[BACKGROUND] [STEP 6/8] Getting promo text... ✅
  ↓
[BACKGROUND] [STEP 7/8] Adding promo to comment... ✅
  ↓
[BACKGROUND] [STEP 8/8] Filling comment box...
[CONTENT] Comment box filled successfully ✅
  ↓
[NOTIFICATION] Comment Ready! 🎉
  ↓
[DATABASE] Updating video status... ✅
  ↓
[PROGRESS] Incrementing counters... ✅
  ↓
=== ✅ VIDEO PROCESSING COMPLETE ===
```

---

## Performance Notes

- **Transcript extraction**: 2-5 seconds
- **AI processing**: 10-30 seconds (depends on video length and chunking)
- **Total time per video**: ~15-40 seconds
- **Content script ready timeout**: Max 10 seconds (20 attempts × 500ms)

---

## Emergency Reset

If extension gets stuck:

1. **Reset Processing State**:
   ```javascript
   // Run in background worker console:
   chrome.storage.local.set({ isProcessing: false });
   ```

2. **Clear All Data**:
   ```javascript
   // Run in background worker console:
   chrome.storage.local.clear(() => {
     console.log('Storage cleared');
   });
   ```

3. **Reload Extension**:
   - Go to `chrome://extensions/`
   - Click reload button on extension card

4. **Restart Service Worker**:
   - Go to `chrome://extensions/`
   - Find extension → Click "Inspect views: service worker"
   - Close the console window
   - Worker will restart automatically
