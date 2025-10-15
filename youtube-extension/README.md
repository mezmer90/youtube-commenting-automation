# YouTube Video Commenter Extension

A Chrome extension that automates AI-generated comments on YouTube videos with intelligent processing, progress tracking, and Notion integration.

---

## Features

- **Automatic Video Fetching**: Gets next pending video from your backend
- **Smart Transcript Extraction**: Extracts YouTube transcripts automatically
- **AI-Powered Comments**: Generates summary, chapters, or takeaways using Gemini Flash
- **Progress Tracking**: Monitors 100 videos/day limit with IST timezone reset
- **Notion Integration**: Saves summaries to category-specific Notion databases
- **Promo Text Rotation**: Randomly adds promotional text (top/bottom)
- **Manual Comment Submission**: Fills comment box for you to review and submit

---

## Installation

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `youtube-extension` folder
5. Extension icon should appear in your toolbar

### 2. Backend Setup

The extension requires the backend to be running:
- **Backend URL**: `https://youtube-commenting-automation-production.up.railway.app`
- Already configured in `config.js`

### 3. Database Populated

Make sure videos are populated in the database:
```bash
curl -X POST https://youtube-commenting-automation-production.up.railway.app/api/populate \
  -H "Content-Type: application/json" \
  -d '{"category_name":"AI & Technology","keywords":["AI tutorial","machine learning"],"max_results":50}'
```

---

## Usage

### Step 1: Select Category

1. Click the extension icon in Chrome toolbar
2. Select a category from the dropdown (AI & Technology, Marketing, Fitness & Health)

### Step 2: Process Videos

1. Click **Next Video** button
2. Extension will:
   - Fetch next pending video from backend
   - Open video in current tab
   - Extract transcript
   - Generate AI summary and comment
   - Fill comment box with generated text
   - Show notification when ready

### Step 3: Submit Comment

1. Review the generated comment in YouTube's comment box
2. Make any edits if needed
3. Click YouTube's **Comment** button to submit
4. Repeat for next video

### Daily Progress

- **Limit**: 100 videos per day
- **Reset**: Midnight IST (GMT+5:30)
- **Progress Bar**: Shows X/100 completed today

---

## Architecture

```
Extension
├── manifest.json           # Extension configuration
├── config.js              # Settings and constants
├── background.js          # Service worker (main logic)
├── content.js            # YouTube page interactions
├── popup/
│   ├── popup.html        # Extension UI
│   ├── popup.css         # Styles
│   └── popup.js          # Popup logic
└── utils/
    ├── api.js           # Backend API calls
    ├── storage.js       # Chrome storage management
    └── youtube.js       # Transcript extraction and comment posting
```

---

## Workflow

```
1. User clicks "Next Video"
2. Extension fetches next video from backend API
3. Opens video in current tab
4. Waits for page load
5. Checks if user is logged in to YouTube
6. Checks if transcript is available
7. Extracts transcript from YouTube
8. Sends transcript to backend for AI processing
9. Backend generates summary + comment
10. Extension selects random promo text
11. Adds promo to comment (top or bottom)
12. Fills YouTube comment box
13. Notifies user to review and submit
14. Updates video status in database
15. Increments daily progress counter
```

---

## Configuration

### Change Backend URL

Edit `config.js`:
```javascript
API_BASE_URL: 'https://your-backend-url.com'
```

### Adjust Daily Limit

Edit `config.js`:
```javascript
DAILY_LIMIT: 150  // Change from 100 to 150
```

### Change Timezone

Edit `config.js`:
```javascript
TIMEZONE: 'America/New_York',
TIMEZONE_OFFSET: -300  // Minutes offset from UTC
```

---

## Settings

Click **Settings** button in popup to access:

### Notion Integration
- Enter your Notion API key
- When switching categories, extension prompts for Notion database selection
- Database name must match category name

### Comment Type Preference
- **Random**: Randomly selects summary/chapters/takeaways (recommended)
- **Always Summary**: Only generates summaries
- **Always Chapters**: Only generates chapters
- **Always Takeaways**: Only generates takeaways

### Clear All Data
- Resets daily progress counter
- Clears selected category
- Clears Notion settings

---

## Troubleshooting

### "Transcript not available"
- Some videos don't have transcripts
- Extension automatically skips these videos
- Check that captions are enabled on the video

### "Not logged in to YouTube"
- You must be logged in to YouTube to comment
- Log in to YouTube and try again

### "Comment box not found"
- Wait for page to fully load
- Refresh the YouTube page
- Disable other YouTube extensions that might interfere

### "Daily limit reached"
- Wait until midnight IST for reset
- Or manually reset via Settings > Clear All Data

### Extension not loading
- Check `chrome://extensions/` for errors
- Click **Reload** on the extension card
- Check browser console (F12) for errors

---

## API Endpoints Used

- `GET /api/categories` - Get all categories
- `GET /api/videos/next?category_id={id}` - Get next video
- `POST /api/ai/process` - Process transcript with AI
- `POST /api/videos/update-status` - Update video status
- `POST /api/progress/increment` - Increment progress
- `GET /api/progress/daily` - Get daily progress

---

## Storage Structure

```javascript
{
  selectedCategory: 1,                    // Currently selected category ID
  dailyProgress: 23,                      // Videos commented today
  lastResetDate: '2025-10-14',           // Last reset date
  notionApiKey: 'secret_xxx',            // Notion API key
  notionDatabases: {                     // Notion database mappings
    1: {
      databaseId: 'xxx',
      databaseName: 'AI & Technology'
    }
  },
  isProcessing: false                    // Currently processing flag
}
```

---

## Development

### Debugging

1. Open `chrome://extensions/`
2. Click **Inspect views: service worker** (for background.js)
3. Click **Inspect** on popup.html (for popup)
4. Check **Console** tab for logs

### Testing

Test individual components:

```javascript
// In browser console on YouTube page
YouTubeUtils.getTranscript().then(console.log);
YouTubeUtils.getVideoMetadata();
YouTubeUtils.hasTranscript();
```

### Hot Reload

After making changes:
1. Go to `chrome://extensions/`
2. Click **Reload** on the extension
3. Refresh YouTube page if testing content script

---

## Known Limitations

1. **Manual Submission**: YouTube doesn't allow auto-submitting comments (anti-spam)
2. **Transcript Dependency**: Only works on videos with available transcripts
3. **Single Tab**: Process one video at a time in current tab
4. **Login Required**: Must be logged in to YouTube
5. **Rate Limiting**: Respect YouTube's comment rate limits (100/day)

---

## Future Enhancements

- [ ] Batch processing queue
- [ ] Automatic Notion saving
- [ ] Comment templates customization
- [ ] Multi-language support
- [ ] Statistics dashboard
- [ ] Export processed videos to CSV
- [ ] Retry failed videos
- [ ] Video filtering by duration/views

---

## Support

For issues or questions:
- Check backend logs in Railway
- Check extension console in Chrome DevTools
- Review `SYSTEM_OVERVIEW.md` for backend details

---

## License

Internal tool - Not for public distribution
