# Installation Guide - YouTube Commenter Extension

## ✅ All Files Ready!

Your extension is now **100% complete** and ready to install.

---

## Step-by-Step Installation

### 1. Open Chrome Extensions Page (30 seconds)

1. Open Google Chrome
2. Type in address bar: `chrome://extensions/`
3. Press Enter

### 2. Enable Developer Mode (10 seconds)

1. Look for toggle switch in **top-right corner**
2. Click to enable **"Developer mode"**
3. You'll see new buttons appear: "Load unpacked", "Pack extension", "Update"

### 3. Load Extension (30 seconds)

1. Click **"Load unpacked"** button
2. Navigate to your project folder:
   ```
   E:\claude-code\yt-commenting-project\youtube-extension
   ```
3. Click **"Select Folder"**

### 4. Verify Installation (10 seconds)

You should see:
- ✅ Extension card with "YouTube Video Commenter Automation"
- ✅ Blue "YT" icon
- ✅ No errors (red text)
- ✅ "Service worker" status showing

### 5. Pin Extension (10 seconds)

1. Click puzzle piece icon 🧩 in Chrome toolbar (top-right)
2. Find "YouTube Video Commenter Automation"
3. Click pin icon 📌 next to it
4. Extension icon now visible in toolbar

---

## First Test Run

### 1. Open Extension (5 seconds)

Click the extension icon in toolbar → Popup opens

### 2. Check Backend Connection (10 seconds)

In the popup, you should see:
- ✅ Category dropdown showing: "AI & Technology (13 videos)"
- ✅ Progress bar: "0/100"
- ✅ Status indicator: Green dot + "Ready"

**If categories don't load:**
- Check backend health: Open https://youtube-commenting-automation-production.up.railway.app/health
- Should return: `{"status":"healthy","database":"connected"}`

### 2.5 Configure Notion Integration (Optional - 3 minutes)

If you want automatic Notion saving:
1. Click **Settings** in popup
2. Enter your Notion API key
3. When switching categories, you'll be prompted to select a Notion database
4. Videos will now automatically save to Notion with full summaries

### 3. Log In to YouTube (30 seconds)

1. Open YouTube.com in a new tab
2. Make sure you're logged in
3. This is required for commenting

### 4. Process First Video (2 minutes)

1. Go back to extension popup
2. Select **"AI & Technology"** from dropdown
3. Click **"Next Video"** button
4. Extension will:
   - Open a YouTube video in current tab
   - Extract transcript (you'll see activity in logs)
   - Generate AI comment
   - Fill comment box
   - Show notification: "Comment Ready!"
5. Review the comment in YouTube's comment box
6. Click YouTube's blue **"Comment"** button to submit

### 5. Check Progress (5 seconds)

- Progress bar should show: "1/100"
- Activity log shows all steps completed

---

## Troubleshooting

### ❌ "Manifest file is missing or unreadable"
**Fix**: Make sure you selected the `youtube-extension` folder, not a subfolder

### ❌ Categories not loading
**Fix**:
1. Check backend: https://youtube-commenting-automation-production.up.railway.app/health
2. Right-click extension → "Inspect popup" → Check console for errors

### ❌ "Transcript not available"
**Fix**: Some videos don't have transcripts. Click "Next Video" to try another.

### ❌ "Not logged in to YouTube"
**Fix**: Log in to YouTube and refresh the page

### ❌ Extension not working after Chrome restart
**Fix**:
1. Go to `chrome://extensions/`
2. Click "Reload" button on extension card

---

## Debugging

### View Extension Logs

**For Popup:**
1. Right-click extension icon
2. Click "Inspect popup"
3. Console tab shows logs

**For Background Script:**
1. Go to `chrome://extensions/`
2. Find your extension
3. Click "Inspect views: service worker"
4. Console tab shows background logs

**For Content Script:**
1. Open a YouTube video page
2. Press F12 (Developer Tools)
3. Console tab shows content script logs

### Common Log Messages

✅ **Good signs:**
```
Extension popup loaded
Loading categories...
Loaded 3 categories
Extracting YouTube transcript...
Transcript extracted: 5000 characters
Processing with AI...
AI generated summary comment
Comment text inserted successfully
Video processed successfully!
```

❌ **Error signs:**
```
Error loading categories: Failed to fetch
Transcript button not found
Error extracting transcript
AI processing failed
Failed to fill comment box
```

---

## Updating the Extension

After making code changes:

1. Go to `chrome://extensions/`
2. Find your extension
3. Click **"Reload"** button (circular arrow icon)
4. Refresh any open YouTube tabs

---

## Uninstalling

1. Go to `chrome://extensions/`
2. Find your extension
3. Click **"Remove"** button
4. Confirm deletion

---

## Extension Files Checklist

Before installation, verify these files exist:

```
youtube-extension/
├── ✅ manifest.json
├── ✅ config.js
├── ✅ background.js
├── ✅ content.js
├── ✅ popup/
│   ├── ✅ popup.html
│   ├── ✅ popup.css
│   └── ✅ popup.js
├── ✅ utils/
│   ├── ✅ api.js
│   ├── ✅ storage.js
│   └── ✅ youtube.js
└── ✅ icons/
    ├── ✅ icon16.png
    ├── ✅ icon48.png
    └── ✅ icon128.png
```

All files present? ✅ **You're ready to install!**

---

## Success Indicators

After installation, you should be able to:
- ✅ Click extension icon → Popup opens
- ✅ See 3 categories in dropdown
- ✅ See "13 videos" in AI & Technology
- ✅ Click "Next Video" → Video opens
- ✅ See progress bar update after commenting
- ✅ View activity logs in popup

---

## Next Steps

1. **Process 5-10 test videos** to verify everything works
2. **Populate other categories** (Marketing, Fitness)
3. **Setup Notion integration** (optional)
4. **Start daily commenting** (100/day limit)

---

## Support

If you encounter issues:
1. Check extension console logs (F12)
2. Check backend logs in Railway dashboard
3. Review `README.md` for detailed documentation
4. Check `SYSTEM_OVERVIEW.md` for architecture details

---

**Installation time**: ~2 minutes
**First video processing**: ~2 minutes
**Daily capacity**: 100 videos

🎉 **Enjoy your automated YouTube commenting!**
