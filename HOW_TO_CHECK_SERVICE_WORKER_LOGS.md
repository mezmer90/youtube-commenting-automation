# How to Check Extension Service Worker Logs

The Notion integration runs in the background service worker, not in the YouTube page.

## Steps to View Service Worker Console:

1. Open Chrome and go to: `chrome://extensions`
2. Find "YouTube Video Commenter" extension
3. Click on **"service worker"** link (blue text under the extension)
4. A DevTools window will open showing the service worker console
5. This is where you'll see all the `[NOTION]` and `[NOTION DB]` logs

## What to Look For:

After processing a video, you should see logs like:
```
[NOTION] Checking Notion configuration...
[NOTION] ✅ Notion configured with API Key + Parent Page ID
[NOTION] Category: Prompt Engineering (ID: 1)
[NOTION DB] Checking database for category...
[NOTION DB] ✅ Found existing database: Prompt Engineering - Video Summaries
[NOTION] Saving video to Notion database...
[NOTION API] Initial - POST /pages
[NOTION] ✅ Saved to Notion: https://notion.so/...
```

## If You Don't See These Logs:

It means:
1. Notion settings are not configured (missing API Key or Parent Page ID)
2. Or there's an error being caught silently

## Next Steps:

1. Check the service worker console after processing a video
2. Share the FULL service worker console output (not the YouTube page console)
3. This will show exactly what's happening with Notion
