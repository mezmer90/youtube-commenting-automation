# 🚂 Railway Deployment Guide

## ✅ Backend Ready for Deployment!

Your backend is fully built and tested locally. Here's how to deploy to Railway.

---

## 🎯 Option 1: Deploy via Railway CLI (Recommended)

### Step 1: Login to Railway
```bash
railway login
```
This will open a browser for authentication.

### Step 2: Link to Project
```bash
cd backend
railway link
```
Select your existing Railway project from the list.

### Step 3: Set Environment Variables
```bash
railway variables set DATABASE_URL="postgresql://postgres:bBjscYLBdysIrAdwahrNtFnJfnZyXAql@ballast.proxy.rlwy.net:32467/railway"
railway variables set YOUTUBE_API_KEY="YOUR_YOUTUBE_API_KEY_HERE"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"
```

### Step 4: Deploy
```bash
railway up
```

That's it! Railway will build and deploy your backend.

---

## 🎯 Option 2: Deploy via GitHub (Easiest)

### Step 1: Push to GitHub
```bash
cd backend
git init
git add .
git commit -m "Initial backend commit"
git remote add origin https://github.com/mezmer90/youtube-commenting-automation.git
git push -u origin main
```

### Step 2: Connect Railway to GitHub

1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repo: `mezmer90/youtube-commenting-automation`
5. Select the `backend` directory

### Step 3: Set Environment Variables in Railway

In Railway dashboard → Your Project → Variables:

```
DATABASE_URL=postgresql://postgres:bBjscYLBdysIrAdwahrNtFnJfnZyXAql@ballast.proxy.rlwy.net:32467/railway
YOUTUBE_API_KEY=YOUR_KEY_HERE
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*
```

### Step 4: Deploy

Railway will auto-deploy! Check the logs in dashboard.

---

## 🎯 Option 3: Manual Deployment via Railway GUI

### Step 1: Create New Service

1. Go to Railway dashboard
2. Select your project (where PostgreSQL is)
3. Click "New" → "Empty Service"

### Step 2: Upload Code

You have two choices:
- **GitHub**: Connect to your repo
- **Local**: Use Railway CLI to upload

### Step 3: Configure

Set these environment variables in Railway dashboard:

```env
DATABASE_URL=postgresql://postgres:bBjscYLBdysIrAdwahrNtFnJfnZyXAql@ballast.proxy.rlwy.net:32467/railway
YOUTUBE_API_KEY=your-key-here
NODE_ENV=production
PORT=3000
```

### Step 4: Deploy

Click "Deploy" button in Railway dashboard.

---

## 🔑 Getting YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **YouTube Data API v3**
4. Go to Credentials → Create Credentials → API Key
5. Copy the API key
6. Add to Railway environment variables

---

## ✅ Verify Deployment

Once deployed, Railway will give you a URL like:
```
https://your-backend.up.railway.app
```

### Test Endpoints:

```bash
# Health check
curl https://your-backend.up.railway.app/health

# Get categories
curl https://your-backend.up.railway.app/api/categories

# Get daily progress
curl https://your-backend.up.railway.app/api/progress/daily
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-14T..."
}
```

---

## 📊 Populate Videos

Once deployed, you can populate videos in two ways:

### Method 1: API Endpoint (from anywhere)

```bash
curl -X POST https://your-backend.up.railway.app/api/populate \
  -H "Content-Type: application/json" \
  -d '{
    "category_name": "AI & Technology",
    "keywords": ["AI tutorial", "machine learning"],
    "max_results": 50,
    "order": "relevance",
    "adaptive_threshold": true
  }'
```

### Method 2: Run Script via Railway CLI

```bash
railway run npm run populate-videos
```

This runs the populate script using Railway's environment.

---

## 🔧 Troubleshooting

### "Database connection error"
- Make sure DATABASE_URL is set correctly in Railway variables
- Verify PostgreSQL service is running

### "YOUTUBE_API_KEY not set"
- Add YOUTUBE_API_KEY to Railway environment variables
- Make sure you enabled YouTube Data API v3 in Google Cloud

### "Build failed"
- Check Railway logs for errors
- Ensure `package.json` is in the backend root
- Verify Node.js version (requires 18+)

### "Port binding error"
- Make sure PORT variable is set to 3000
- Railway will automatically assign the port

---

## 📝 Next Steps After Deployment

1. ✅ Backend deployed successfully
2. 🔑 Add YouTube API key to Railway variables
3. 📊 Populate videos using `/api/populate` endpoint
4. 🧪 Test all endpoints
5. 🎨 Start building Chrome extension
6. 🔗 Connect extension to your Railway backend URL

---

## 🎉 Backend is Production-Ready!

Your backend includes:
- ✅ Full REST API
- ✅ YouTube Data API v3 integration
- ✅ PostgreSQL database connection
- ✅ Video population system
- ✅ Progress tracking
- ✅ Error handling
- ✅ CORS enabled
- ✅ Health checks

**Your Railway Backend URL**: (will be shown after deployment)

---

**Questions?** Check the main README or TECHNICAL_SPECIFICATION.md
