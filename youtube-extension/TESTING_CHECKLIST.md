# Testing Checklist

Before testing the extension, verify these prerequisites:

## ✅ Prerequisites

### 1. **YouTube Login** (REQUIRED)
- [ ] Open YouTube.com in your browser
- [ ] **Log in to your YouTube account**
- [ ] Verify you see your profile picture in top-right corner
- [ ] **DO NOT test on incognito/logged-out state**

**Why?** The extension checks for `button#avatar-btn` which only exists when logged in.

---

### 2. **Extension Installation**
- [ ] Extension loaded at `chrome://extensions/`
- [ ] No errors on extension card
- [ ] Extension icon visible in toolbar
- [ ] Service worker status shows "Active"

---

### 3. **Backend Health Check**
Open this URL in browser:
```
https://youtube-commenting-automation-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

- [ ] Backend responds with healthy status
- [ ] Database is connected

---

### 4. **Console Windows Open** (For Debugging)

Open these 3 console windows:

#### A. Background Worker Console
1. Go to `chrome://extensions/`
2. Find "YouTube Video Commenter Automation"
3. Click **"Inspect views: service worker"**
4. Console window opens
5. Keep this open during testing

#### B. YouTube Page Console
1. Open any YouTube video
2. Press `F12` (or right-click → Inspect)
3. Go to **Console** tab
4. Keep this open during testing

#### C. Popup Console (Optional)
1. Right-click extension icon
2. Select **"Inspect"**
3. Console opens
4. Keep this open during testing

---

## 🧪 Testing Steps

### Test 1: Category Loading

1. Click extension icon in toolbar
2. Wait 2-3 seconds

**Expected:**
- Popup shows category dropdown
- Categories loaded: "AI & Technology (13 videos)", etc.
- Progress bar shows: "0/100"
- Status: Green dot + "Ready"

**Check Console:**
```
[INFO] Extension popup loaded
[INFO] Loading categories...
[API] GET request to: .../api/categories
[API] GET response status: 200
[INFO] Loaded 3 categories
```

---

### Test 2: Video Selection & Opening

1. Select a category from dropdown
2. Click **"Next Video"** button

**Expected:**
- Current tab redirects to a YouTube video
- Video opens and starts loading

**Check Background Console:**
```
Background received message: processNextVideo
Fetching next video from backend...
[API] GET request to: .../api/videos/next?category_id=1
[API] GET response status: 200
Next video: [Video Title]
Waiting for page to load and content script to initialize...
```

---

### Test 3: Content Script Loading

After video opens, wait 5-10 seconds.

**Expected:**
Background console shows:
```
Waiting for content script... attempt 1/20
Waiting for content script... attempt 2/20
...
Content script is ready
=== STARTING VIDEO PROCESSING ===
```

**Check YouTube Page Console:**
```
YouTube Commenter Extension: Content script loaded
MetadataExtractor injected into page
```

**If stuck on "Waiting for content script":**
- Manually refresh the YouTube page
- Check YouTube console for errors
- Reload extension at `chrome://extensions/`

---

### Test 4: Login Check

**Check Background Console:**
```
[STEP 1/8] Checking YouTube login status...
Login check response: {success: true, isLoggedIn: true}
✅ User is logged in
```

**If you see `isLoggedIn: false`:**
- ❌ **You are NOT logged in to YouTube**
- Open YouTube.com and log in
- Try again

---

### Test 5: Transcript Check

**Check Background Console:**
```
[STEP 2/8] Checking if transcript is available...
Transcript check response: {success: true, hasTranscript: true}
✅ Transcript is available
```

**If you see `hasTranscript: false`:**
- This video doesn't have captions/transcript
- Extension will skip it automatically
- Click "Next Video" to try another one

**Manual verification:**
- Click "..." (three dots) below video
- Look for "Show transcript" option
- If it doesn't exist, transcript is not available

---

### Test 6: Transcript Extraction

This takes **2-5 seconds**.

**Check Background Console:**
```
[STEP 3/8] Extracting transcript...
```

**Check YouTube Page Console:**
```
[CONTENT] Starting transcript extraction...
Extracting transcript...
Video duration from transcript: 12:34
Transcript extracted: 156 segments
[CONTENT] ✅ Transcript extracted: 15234 characters
```

**Expected:**
- Transcript panel opens on the right side of video
- Extension extracts all transcript segments
- Panel may stay open (normal behavior)

---

### Test 7: Metadata Extraction

**Check Background Console:**
```
[STEP 4/8] Getting video metadata...
Metadata response: {success: true, metadata: {...}}
✅ Metadata: {videoId, title, channel, views, likes, ...}
```

---

### Test 8: AI Processing

This takes **10-30 seconds** depending on video length.

**Check Background Console:**
```
[STEP 5/8] Processing with AI...
Sending to backend: {transcriptLength: 15234, metadata: {...}}
[API] POST request to: .../api/ai/process
[API] POST response status: 200
AI response: {success: true, summary: "...", comment: "...", comment_type: "chapters"}
✅ AI generated chapters comment
Summary length: 1234
Comment preview: Here are the key chapters from this video:...
```

**If this fails:**
- Check Railway backend logs
- Verify OpenRouter API key is set
- Backend might be processing (wait up to 1 minute)

---

### Test 9: Promo Text & Comment Filling

**Check Background Console:**
```
[STEP 6/8] Getting promo text...
✅ Selected promo: This summary was generated with VideoSum AI Position: top

[STEP 7/8] Adding promo to comment...
✅ Final comment length: 1456
Final comment preview: This summary was generated with VideoSum AI...

[STEP 8/8] Filling comment box...
```

**Check YouTube Page Console:**
```
[CONTENT] Starting comment box fill...
[CONTENT] Comment length: 1456
Filling comment box...
Comment text inserted successfully
[CONTENT] ✅ Comment box filled successfully
```

**Expected:**
- Page scrolls down to comments section
- Comment box opens
- Comment text appears in comment box

---

### Test 10: Notification

**Expected:**
- Desktop notification appears: "Comment Ready!"
- Message: "Please review and submit the comment manually on YouTube."

---

### Test 11: Database Update

**Check Background Console:**
```
[DATABASE] Updating video status...
Status update payload: {video_id, category_id, summary_text, comment_text, ...}
[API] POST request to: .../api/videos/update-status
[API] POST response status: 200
✅ Video status updated

[PROGRESS] Incrementing progress counters...
✅ Backend progress incremented
✅ Local progress incremented

=== ✅ VIDEO PROCESSING COMPLETE ===
```

---

## ✅ Success Criteria

All these should be true:

- [x] Video opens successfully
- [x] Transcript extracted
- [x] AI processing completes
- [x] Comment appears in YouTube comment box
- [x] Notification shows "Comment Ready!"
- [x] No errors in console
- [x] Progress incremented (check popup: should show "1/100")

---

## ❌ Common Issues & Solutions

### Issue: "Could not establish connection"

**Cause:** Content script not loaded

**Solution:**
1. Refresh YouTube page manually
2. Wait for content script logs to appear
3. Try clicking "Next Video" again

---

### Issue: "Please log in to YouTube first"

**Cause:** Not logged in

**Solution:**
1. **Open YouTube.com**
2. **Log in to your account**
3. Verify profile picture appears
4. Try extension again

---

### Issue: "No transcript available"

**Cause:** Video doesn't have captions

**Solution:**
1. This is normal - some videos don't have transcripts
2. Extension automatically skips these
3. Click "Next Video" to try another one

---

### Issue: "AI processing failed"

**Cause:** Backend error or timeout

**Solution:**
1. Check backend health: `/health` endpoint
2. Check Railway logs for errors
3. Verify OpenRouter API key
4. Wait 1-2 minutes and try again

---

### Issue: "Failed to fill comment box"

**Cause:** Comment box not found

**Solution:**
1. Check if comments are disabled on video
2. Manually scroll to comments section
3. Try different video

---

## 🎯 Quick Test (2 minutes)

Minimal test to verify extension works:

1. **Log in to YouTube**
2. Load extension
3. Click extension icon → Should show categories
4. Click "Next Video"
5. Wait 30-60 seconds
6. Check if comment appears in comment box
7. If yes → **Extension works!** ✅

---

## 📊 Performance Benchmarks

Normal timings:

- Category loading: **1-2 seconds**
- Video opening: **2-3 seconds**
- Content script ready: **2-5 seconds**
- Transcript extraction: **2-5 seconds**
- AI processing: **10-30 seconds**
- Comment filling: **2-3 seconds**

**Total time per video:** 20-50 seconds

---

## 🚨 Emergency Procedures

### If Extension Gets Stuck:

1. **Reset processing state:**
   ```javascript
   // In background worker console:
   chrome.storage.local.set({ isProcessing: false });
   ```

2. **Reload extension:**
   - Go to `chrome://extensions/`
   - Click reload button

3. **Clear storage:**
   ```javascript
   // In background worker console:
   chrome.storage.local.clear();
   ```

4. **Restart browser** (last resort)

---

## 📝 Report Template

If issues persist, copy this template:

```
**Extension Version:** 1.0.0
**Chrome Version:** [Check chrome://version/]
**Issue:** [Describe problem]

**Background Console Logs:**
[Paste logs here]

**YouTube Page Console Logs:**
[Paste logs here]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
...

**Expected:** [What should happen]
**Actual:** [What actually happened]
```
