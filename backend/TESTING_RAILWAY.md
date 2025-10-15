# 🧪 Testing Railway Production Deployment

## ✅ Changes Pushed to GitHub

The latest updates include:
- ✅ Smart transcript chunking (10,000 character default)
- ✅ Proven prompt templates from working extension
- ✅ Multi-chunk processing with intelligent combination
- ✅ Updated OpenRouterService with all new logic

**Commit:** `d20c64a` - "Integrate proven chunking and prompting logic from youtube-summarizer"

---

## 🚀 Railway Auto-Deployment

If your Railway project is connected to GitHub, it should automatically deploy when you push to the `main` branch.

### Check Deployment Status:

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. Look for the latest deployment with commit message: "Integrate proven chunking and prompting logic..."
4. Wait for deployment to complete (usually 2-3 minutes)

### Required Environment Variables on Railway:

Make sure these are set in Railway dashboard → Variables:

```env
# Database
DATABASE_URL=your_railway_database_url_here

# API Keys
YOUTUBE_API_KEY=your_youtube_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
NOTION_API_KEY=your_notion_api_key_here

# Server Config
PORT=3000
NODE_ENV=production
CORS_ORIGIN=*

# AI Config (NEW - IMPORTANT!)
DEFAULT_AI_MODEL=google/gemini-flash-1.5-8b
DEFAULT_MAX_TOKENS=4096
DEFAULT_CHUNK_SIZE=10000

# Video Fetching
DEFAULT_MAX_RESULTS=50
DEFAULT_MIN_VIEW_COUNT=100000
DEFAULT_UPLOAD_DAYS=730
```

**⚠️ IMPORTANT:** Add the new `DEFAULT_CHUNK_SIZE=10000` variable to Railway!

---

## 🧪 Production Testing Checklist

Once Railway deployment is complete, test these endpoints:

### 1. Health Check
```bash
curl https://your-railway-url.up.railway.app/health
```

Expected:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-14T...",
  "uptime": 123.45
}
```

### 2. Test AI Summary Endpoint (Single Chunk)

```bash
curl -X POST https://your-railway-url.up.railway.app/api/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "[0:00] Welcome to this tutorial. [0:30] Today we will learn about AI. [1:00] This is very important.",
    "metadata": {
      "title": "AI Tutorial",
      "channel": "Tech Channel",
      "url": "https://youtube.com/watch?v=test"
    }
  }'
```

Expected:
```json
{
  "success": true,
  "summary": "... AI generated summary ...",
  "metadata": { ... }
}
```

### 3. Test AI Summary with Long Transcript (Multi-Chunk)

Create a file `test-long-transcript.json`:
```json
{
  "transcript": "[0:00] Part 1... [VERY LONG TEXT - repeat content to exceed 10,000 chars]",
  "metadata": {
    "title": "Long Video Tutorial",
    "channel": "Tech Pro",
    "duration": "45:00"
  }
}
```

Then test:
```bash
curl -X POST https://your-railway-url.up.railway.app/api/ai/summarize \
  -H "Content-Type: application/json" \
  -d @test-long-transcript.json
```

**Look for in Railway logs:**
- `📚 Multi-chunk processing: X chunks`
- `Processing chunk 1/X`
- `🔄 Combining chunk summaries...`
- `✅ Summary generation complete`

### 4. Test Complete Processing Endpoint

```bash
curl -X POST https://your-railway-url.up.railway.app/api/ai/process \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "[0:00] Introduction to web development. [1:00] We will cover HTML, CSS, and JavaScript. [2:00] Let'\''s start with HTML basics...",
    "metadata": {
      "title": "Web Development Crash Course",
      "channel": "Code Academy"
    }
  }'
```

Expected:
```json
{
  "success": true,
  "summary": "... comprehensive summary ...",
  "comment": "... YouTube comment ...",
  "comment_type": "summary|chapters|takeaways",
  "metadata": { ... }
}
```

### 5. Test Chapters Endpoint

```bash
curl -X POST https://your-railway-url.up.railway.app/api/ai/chapters \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "[0:00] Welcome everyone. [2:30] Now let'\''s discuss the basics. [5:00] Advanced concepts here. [8:00] Wrapping up.",
    "metadata": {
      "title": "Complete Tutorial",
      "duration": "10:00"
    }
  }'
```

### 6. Test Takeaways Endpoint

```bash
curl -X POST https://your-railway-url.up.railway.app/api/ai/takeaways \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "[0:00] Key point one is very important. [1:00] Remember to always do this. [2:00] Another crucial tip...",
    "metadata": {
      "title": "Important Tips"
    }
  }'
```

---

## 📊 What to Check in Railway Logs

After testing, check Railway logs for these indicators:

**✅ Successful Chunking:**
```
📝 Generating summary for: [Video Title]
📊 Transcript length: 25000 characters
📚 Multi-chunk processing: 3 chunks
   Processing chunk 1/3 [0:00 - 8:30]
   Processing chunk 2/3 [8:30 - 17:00]
   Processing chunk 3/3 [17:00 - 25:30]
🔄 Combining chunk summaries...
✅ Summary generation complete
```

**✅ OpenRouter API Calls:**
```
🤖 OpenRouter API Request: {
  model: 'google/gemini-flash-1.5-8b',
  promptLength: 12450,
  maxTokens: 4096
}
✅ OpenRouter API Success: {
  outputLength: 1834,
  tokensUsed: 3245
}
```

**❌ Errors to Watch For:**
```
❌ OpenRouter API Error: [error details]
```

---

## 🔧 Troubleshooting

### Issue: "DEFAULT_CHUNK_SIZE is undefined"
**Fix:** Add `DEFAULT_CHUNK_SIZE=10000` to Railway environment variables

### Issue: "OpenRouter API key not configured"
**Fix:** Verify `OPENROUTER_API_KEY` is set in Railway variables

### Issue: Deployment failed
**Fix:** Check Railway build logs for errors. Common issues:
- Missing dependencies (should auto-install from package.json)
- Syntax errors (shouldn't happen, code tested locally)
- Port binding issues (Railway handles this automatically)

### Issue: Very long processing time
**Expected:** Multi-chunk processing takes longer because:
- Each chunk is processed separately
- Final combination step
- Multiple OpenRouter API calls

For a 30,000 char transcript (3 chunks):
- Estimated time: 30-60 seconds
- API calls: 4 (3 chunks + 1 combine)

---

## 🎯 Success Criteria

Your Railway deployment is ready when:

1. ✅ Health endpoint returns `"database": "connected"`
2. ✅ All AI endpoints respond successfully
3. ✅ Multi-chunk processing works (test with 20k+ char transcript)
4. ✅ Comments generate properly for all 3 types
5. ✅ Logs show proper chunking and combining
6. ✅ No errors in Railway deployment logs

---

## 📝 Next Steps After Verification

Once Railway is confirmed working:

1. ✅ Document your Railway URL for extension development
2. ✅ Test with real YouTube video transcripts
3. ✅ Monitor API costs (OpenRouter usage)
4. ✅ Start building Chrome extension to consume these APIs
5. ✅ Integrate Notion API for saving summaries

---

**Your Railway URL:** (Update this after deployment)
```
https://[your-service-name].up.railway.app
```

Save this URL - you'll need it for the Chrome extension configuration!
