# Quick Start Guide

## 5-Minute Setup

### 1. Install Extension (2 minutes)

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer Mode** (top-right toggle)
4. Click **Load unpacked**
5. Select `youtube-extension` folder
6. Pin extension to toolbar (puzzle icon → pin)

### 2. Add Icon Images (1 minute)

Create simple 16x16, 48x48, and 128x128 PNG images for `icons/` folder:
- icon16.png
- icon48.png
- icon128.png

Or use these placeholder colors:
- Background: #065fd4 (YouTube blue)
- Text: "YT" in white

### 3. Test Backend Connection (1 minute)

1. Click extension icon
2. Check if categories load
3. Should see: "AI & Technology (13 videos)"

### 4. Process First Video (1 minute)

1. Select "AI & Technology" category
2. Click **Next Video** button
3. Wait for notification: "Comment Ready!"
4. Review comment and click YouTube's **Comment** button

---

## ✅ That's It!

You're now ready to process 100 videos per day!

---

## Common First-Time Issues

### "Categories not loading"
- Check backend is running: https://youtube-commenting-automation-production.up.railway.app/health
- Should return: `{"status":"healthy","database":"connected"}`

### "No videos found"
- Populate database first:
```bash
curl -X POST https://youtube-commenting-automation-production.up.railway.app/api/populate \
  -H "Content-Type: application/json" \
  -d '{"category_name":"AI & Technology","keywords":["AI tutorial"],"max_results":10}'
```

### "Not logged in to YouTube"
- Log in to YouTube in your browser
- Refresh and try again

---

## Next Steps

1. **Populate more categories**:
   - Marketing
   - Fitness & Health

2. **Setup Notion integration** (optional):
   - Click **Settings**
   - Enter Notion API key
   - Select Notion database when prompted

3. **Monitor progress**:
   - Progress bar shows X/100 completed
   - Resets at midnight IST

---

## Tips for Best Results

1. **One video at a time**: Wait for each to complete
2. **Review comments**: Always check before submitting
3. **Login fresh**: If YouTube logs you out, log back in
4. **Clear cache**: If issues persist, clear browser cache
5. **Check transcripts**: Not all videos have transcripts

---

Happy commenting!
