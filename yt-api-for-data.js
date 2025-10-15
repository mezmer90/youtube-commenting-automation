/** ===============================
 *  YOUTUBE KEYWORD SEO DASHBOARD (YouTube-only)
 *  - No Google Trends; all signals from YouTube
 *  - US-only search results
 *  - Metrics per keyword:
 *      Volume Score (0..100)  -> demand via recent view velocity
 *      Competition Score (0..100, bigger = harder)
 *      Opportunity Score       -> higher = better (Volume vs. Competition)
 *      Related Keywords        -> YouTube autosuggest
 *  - Writes up to 50 videos per keyword (Title, Channel, Views, Likes, URL)
 *  =============================== */

var SHEET_NAME = 'DATA';                // <-- ensure tab exists
var YT_API_KEY = 'AIzaSyCHiMQ1oPpzsiKMCQp74H3zuwHw_Np1TN4';   // <-- put your YouTube Data API v3 key

/** ========== MAIN ========== */
function getYouTubeData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + SHEET_NAME + '" not found.');

  // Read keywords from A2 down
  var keywords = sheet.getRange('A2:A').getDisplayValues()
    .map(function (r) { return (r[0] || '').trim(); })
    .filter(function (s) { return s.length > 0; });

  // Headers (B..J)
  sheet.getRange('B1:J1').setValues([[
    'Video Title','Channel','Views','Likes','URL',
    'Volume Score (YT)','Competition Score','Related Keywords','Opportunity Score'
  ]]);

  // Clear old output in B..J
  var lastRow = Math.max(2, sheet.getMaxRows());
  sheet.getRange(2, 2, lastRow - 1, 9).clearContent();

  var row = 2;

  keywords.forEach(function (keyword) {
    // --- Metrics ---
    var volume = getYouTubeVolumeScore_(YT_API_KEY, keyword);       // 0..1000000 or 'N/A'
    var comp   = getCompetitionScore_(YT_API_KEY, keyword);         // 0..10000 or 'N/A'
    var related = getRelatedKeywords_(keyword);                     // string or 'N/A'

    // Safe math
    var volNum = volume === 'N/A' ? 0 : Number(volume);
    var compNum = comp === 'N/A' ? 0 : Number(comp);
    var opportunity = Math.max(0, Math.round((volNum * (100 - Math.min(100, compNum))) / 10));

    // --- Fetch US YouTube results (up to 50) ---
    var results = fetchYouTubeTop_(YT_API_KEY, keyword, 50, 'relevance');
    if (!results.length) {
      sheet.getRange(row, 2, 1, 9).setValues([[
        '(no results)','',0,0,'',
        volume, comp, related, opportunity
      ]]);
      row++;
    } else {
      results.forEach(function (r) {
        sheet.getRange(row, 2, 1, 9).setValues([[
          r.title, r.channel, r.views, r.likes, r.url,
          volume, comp, related, opportunity
        ]]);
        row++;
      });
    }

    Utilities.sleep(250); // be nice to the API
  });

  Logger.log('Done. Rows written: ' + (row - 2));
}

/** ========== SEARCH & STATS (US) ========== */
// order: 'relevance' | 'viewCount' | 'date'
function fetchYouTubeTop_(apiKey, query, n, order) {
  try {
    var max = Math.min(Math.max(n || 30, 1), 50);
    var searchUrl = 'https://www.googleapis.com/youtube/v3/search'
      + '?part=id'
      + '&type=video'
      + '&order=' + encodeURIComponent(order || 'relevance')
      + '&regionCode=US'
      + '&relevanceLanguage=en'
      + '&maxResults=' + max
      + '&q=' + encodeURIComponent(query)
      + '&key=' + apiKey;

    var searchResp = UrlFetchApp.fetch(searchUrl, { muteHttpExceptions: true });
    if (searchResp.getResponseCode() !== 200) {
      Logger.log('YouTube search error ' + searchResp.getResponseCode() + ': ' + searchResp.getContentText());
      return [];
    }
    var search = JSON.parse(searchResp.getContentText());
    var ids = (search.items || []).map(function (v) { return v.id && v.id.videoId; }).filter(Boolean);
    if (!ids.length) return [];

    // Batch stats (one call for up to 50 IDs)
    var statsUrl = 'https://www.googleapis.com/youtube/v3/videos'
      + '?part=snippet,statistics'
      + '&id=' + ids.join(',')
      + '&key=' + apiKey;

    var statsResp = UrlFetchApp.fetch(statsUrl, { muteHttpExceptions: true });
    if (statsResp.getResponseCode() !== 200) {
      Logger.log('YouTube stats error ' + statsResp.getResponseCode() + ': ' + statsResp.getContentText());
      return [];
    }
    var stats = JSON.parse(statsResp.getContentText());

    return (stats.items || []).map(function (it) {
      var sn = it.snippet || {};
      var st = it.statistics || {};
      return {
        title: sn.title || '',
        channel: sn.channelTitle || '',
        views: Number(st.viewCount || 0),
        likes: Number(st.likeCount || 0),
        url: 'https://www.youtube.com/watch?v=' + it.id
      };
    });
  } catch (e) {
    Logger.log('fetchYouTubeTop_ exception: ' + e);
    return [];
  }
}

/** ========== VOLUME SCORE (YouTube-only) ========== */
/* 
 * Estimate demand using recent view velocity:
 * 1) Search US videos from last 30 days, ordered by viewCount (max 25).
 * 2) Compute average DAILY VIEWS for each: views / ageDays.
 * 3) Scale to 0..100 using median (~50) and 95th percentile (~100).
 */
function getYouTubeVolumeScore_(apiKey, keyword) {
  try {
    var publishedAfter = new Date(Date.now() - 30*24*60*60*1000).toISOString();
    var url = 'https://www.googleapis.com/youtube/v3/search'
      + '?part=id'
      + '&type=video'
      + '&order=viewCount'
      + '&regionCode=US'
      + '&relevanceLanguage=en'
      + '&publishedAfter=' + encodeURIComponent(publishedAfter)
      + '&maxResults=25'
      + '&q=' + encodeURIComponent(keyword)
      + '&key=' + apiKey;

    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) {
      Logger.log('Volume search error ' + resp.getResponseCode() + ': ' + resp.getContentText());
      return 'N/A';
    }
    var data = JSON.parse(resp.getContentText());
    var ids = (data.items || []).map(function(x){ return x.id && x.id.videoId; }).filter(Boolean);
    if (!ids.length) return 'N/A';

    var statsUrl = 'https://www.googleapis.com/youtube/v3/videos'
      + '?part=statistics,snippet'
      + '&id=' + ids.join(',')
      + '&key=' + apiKey;

    var sresp = UrlFetchApp.fetch(statsUrl, { muteHttpExceptions: true });
    if (sresp.getResponseCode() !== 200) {
      Logger.log('Volume stats error ' + sresp.getResponseCode() + ': ' + sresp.getContentText());
      return 'N/A';
    }
    var sdata = JSON.parse(sresp.getContentText());

    var daily = [];
    (sdata.items || []).forEach(function(it){
      var views = Number((it.statistics||{}).viewCount || 0);
      var publishedAtStr = (it.snippet||{}).publishedAt;
      var publishedAt = publishedAtStr ? new Date(publishedAtStr) : new Date();
      var ageDays = Math.max(1, Math.floor((Date.now() - publishedAt.getTime()) / (24*60*60*1000)));
      daily.push(views / ageDays);
    });
    if (!daily.length) return 'N/A';

    // Scale to 0..100: median -> 50, 95th -> 100
    daily.sort(function(a,b){return a-b;});
    var median = daily[Math.floor(daily.length/2)];
    var p95 = daily[Math.max(0, Math.floor(daily.length*0.95)-1)];
    if (!p95 || p95 <= median) p95 = median + 1;
    var avgDaily = daily.reduce(function(a,b){return a+b;}, 0) / daily.length;

    var score = Math.round( (avgDaily - median) / (p95 - median) * 50 + 50 );
    return Math.max(0, Math.min(100, score));
  } catch (e) {
    Logger.log('getYouTubeVolumeScore_ exception: ' + e);
    return 'N/A';
  }
}

/** ========== COMPETITION SCORE (0..100; bigger = harder) ========== */
/*
 * Top 20 US results by relevance; compute average views and multiply by count,
 * then normalize to 0..100.
 */
function getCompetitionScore_(apiKey, keyword) {
  try {
    var searchUrl = 'https://www.googleapis.com/youtube/v3/search'
      + '?part=id&type=video&regionCode=US&relevanceLanguage=en'
      + '&maxResults=20&q=' + encodeURIComponent(keyword)
      + '&key=' + apiKey;

    var searchResp = UrlFetchApp.fetch(searchUrl, { muteHttpExceptions: true });
    if (searchResp.getResponseCode() !== 200) {
      Logger.log('YouTube search (competition) error ' + searchResp.getResponseCode() + ': ' + searchResp.getContentText());
      return 'N/A';
    }
    var search = JSON.parse(searchResp.getContentText());
    var vids = (search.items || []).map(function (v) { return v.id && v.id.videoId; }).filter(Boolean);
    if (!vids.length) return 0;

    var statsUrl = 'https://www.googleapis.com/youtube/v3/videos'
      + '?part=statistics&id=' + vids.join(',')
      + '&key=' + apiKey;
    var statsResp = UrlFetchApp.fetch(statsUrl, { muteHttpExceptions: true });
    if (statsResp.getResponseCode() !== 200) {
      Logger.log('YouTube stats (competition) error ' + statsResp.getResponseCode() + ': ' + statsResp.getContentText());
      return 'N/A';
    }
    var stats = JSON.parse(statsResp.getContentText());
    var totals = (stats.items || []).map(function (it) { return Number((it.statistics || {}).viewCount || 0); });
    var avg = totals.length ? totals.reduce(function (a, b) { return a + b; }, 0) / totals.length : 0;

    var raw = Math.round((vids.length * avg) / 1000000); // normalize
    return Math.min(100, raw);
  } catch (e) {
    Logger.log('getCompetitionScore_ exception: ' + e);
    return 'N/A';
  }
}

/** ========== RELATED KEYWORDS (YouTube autosuggest) ========== */
function getRelatedKeywords_(keyword) {
  try {
    var url = 'https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=' + encodeURIComponent(keyword);
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) {
      Logger.log('Suggest error ' + resp.getResponseCode() + ': ' + resp.getContentText());
      return 'N/A';
    }
    var data = JSON.parse(resp.getContentText());
    var list = Array.isArray(data[1]) ? data[1].slice(0, 5) : [];
    return list.join(', ') || 'N/A';
  } catch (e) {
    Logger.log('getRelatedKeywords_ exception: ' + e);
    return 'N/A';
  }
}

/** ========== Optional: daily trigger at 6 AM ========== */
function createDailyTrigger() {
  ScriptApp.newTrigger('getYouTubeData')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
}
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Keyword AI')
    .addItem('Run YouTube Fetch', 'runDashboard')
    .addToUi();
}
