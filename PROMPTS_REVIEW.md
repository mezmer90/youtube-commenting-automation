# YouTube Commenting Automation - AI Prompts Review

This document contains all the AI prompts used in your YouTube commenting automation system. The prompts are located in the **backend** (`backend/src/utils/prompt-templates.js`) and are called by the Chrome extension.

Please review each prompt and add your feedback directly in this file under each section.

---

## SYSTEM OVERVIEW

Your extension generates 3 types of YouTube comments:
1. **Summary Comments** - Highlights main value of the video (3-5 sentences)
2. **Chapters Comments** - Timestamps and chapter breakdown for navigation
3. **Takeaways Comments** - Key actionable points from the video (3-5 bullet points)

The system works in 2 steps:
- **Step 1:** Generate content (summary/chapters/takeaways) from transcript
- **Step 2:** Convert that content into a natural YouTube comment

---

## 1. SUMMARY GENERATION PROMPT

**Purpose:** Generates comprehensive bullet-point summary from video transcript
**Location:** `backend/src/utils/prompt-templates.js` (lines 12-35)
**Function:** `getSummaryPrompt()`

**Current Prompt:**
```
Create a comprehensive bullet-point summary of this YouTube video with timestamps and actionable takeaways.

Video information:
Title: {videoInfo.title}
Channel: {videoInfo.channel}
URL: {videoInfo.url}
Duration: {videoInfo.duration}
[Note: If chunked, indicates this is part of a longer video]

Raw YouTube transcript data:
{transcript}

Instructions:
1. Format your response in clean markdown
2. Include 10-20 key points from the video, each with its relevant timestamp
3. For each main point, add 1-3 actionable takeaways or practical applications
4. Highlight important quotes, facts, or statistics when relevant
5. End with a "Key Takeaways" section of 3-5 bullet points summarizing the most practical information
6. Keep the formatting clean and consistent for easy reading
7. Focus on information that would be most useful to someone wanting to implement the content
```

**YOUR FEEDBACK:**
```
OK so firstly like we don't want it to be like changing the comments. If it is doing the summary it will post the entire summary as the comment. If it is doing takeaways then it will boost the takeaways as the comment. If it is being chatted address, it will post the chapter titles as the comments. OK. Now one thing to do is make sure to introduce the human nature of doing like writing summaries in the 1st person as if the user has taken the summary and. If you can, refer to the author. If you come to know about the author then mention like that you know. XYZ person was saying this in the video or something like that also. Like don't limit to 1020 bullets or something like that. It's already chunking and doing it right. So it it should basically summarize in the best way possible for the video OK. If the video is about how to steps, then all the steps should be there. If it's about list tickles or the list tickle should be there. If it's about something that is not like organized list or something like that, then all the takeaways and entire summary should be there. The TLDR version of the summary can be given, no. Remove the TLDR not required. So that is how the chunking should happen. Also it should not have any M, dashes, it should not have any AI generated words. It should feel like it's humanly written and the language should be very simple. Maximum grade 10 to grade 12 English. And it is. And all these points should be taken into effect. We don't want to truncate the comments, especially OK. That is one thing. So with that in mind, now also when the summary is happening like. This should be good enough. One thing that I just want to understand is for example, if let's say there a video was broken down into 5 chunks, each chunk was processed and summarized, then at the end like when the summary is output like it will be different chunk summaries that are posted right? But then they will be starting an end points of these chunks that will kind of break the overall summary, right? So can we do the output in a manner that the final summary actually looks like one summary? For the entire video without really losing any data OK. So we don't want to further process the summaries in a way that it loses context or it shortens it further. Again, timestamps are very important to have, make sure the timestamps are included. As well. With all the in all the relevant places. So this is the entire thought process that I have. You can ask me clarifying questions and. Make sure that you take all this feedback.
```

---

## 2. CHAPTERS GENERATION PROMPT

**Purpose:** Creates chapter breakdown with timestamps
**Location:** `backend/src/utils/prompt-templates.js` (lines 43-72)
**Function:** `getChaptersPrompt()`

**Current Prompt:**
```
Analyze this YouTube video transcript and create a detailed chapter breakdown with timestamps.

Video information:
Title: {videoInfo.title}
Channel: {videoInfo.channel}
Duration: {videoInfo.duration}

Transcript with timestamps:
{transcript}

Instructions:
1. Identify 5-8 meaningful chapters based on topic changes and content flow
2. Format each chapter as: [TIMESTAMP] - Chapter Title
3. Use timestamps from the transcript (format: MM:SS or HH:MM:SS)
4. Each chapter title should be clear and descriptive (5-10 words)
5. Add a brief 1-2 sentence description under each chapter explaining what's covered
6. Start with 0:00 for Introduction (or earliest timestamp)
7. Ensure chapters flow logically and cover the entire video

Example format:
0:00 - Introduction and Overview
Brief intro about the topic and what will be covered

2:30 - Main Concept Explained
Detailed explanation of the core concept

5:45 - Practical Application
Real-world examples and how to apply the concept
```

**YOUR FEEDBACK:**
```
Again, same thing here. You know why are you saying that it has to be doing 5 to 8 meaningful chapters? Don't like limited OK if whatever chapters are required and make sense to the video should be added. If there are listicles then definitely listical chapter should be there. If there are take away steps then steps, chapters should be there and things like that. So definitely include that kind of logic and make sure again all my feedback about humanly written no M, no AI, generated words, simple English from the previous like feedback should also be incorporated.
```

---

## 3. TAKEAWAYS GENERATION PROMPT

**Purpose:** Extracts most valuable and actionable insights
**Location:** `backend/src/utils/prompt-templates.js` (lines 80-103)
**Function:** `getTakeawaysPrompt()`

**Current Prompt:**
```
Extract the most valuable and actionable takeaways from this YouTube video transcript.

Video information:
Title: {videoInfo.title}
Channel: {videoInfo.channel}

Transcript:
{transcript}

Instructions:
1. Identify the Top 5-7 Key Takeaways from the video
2. Each takeaway should be 1-2 sentences
3. Focus on actionable insights, practical advice, and important concepts
4. Include relevant timestamps where these points are discussed
5. Prioritize information that viewers can immediately apply
6. Format as a clear numbered list
7. Be concise but comprehensive

Example format:
1. [TIMESTAMP] Main takeaway here - Additional context or explanation
2. [TIMESTAMP] Another key point - Why it matters
...
```

**YOUR FEEDBACK:**
```
I think all my previous feedback about the takeaways also stands relevant here, so make sure you do that. And common generation should not be separate like the same takeaway summary and chapters should be used essentially. So don't do it differently. OK. One thing that I would like to mention is that no matter what is see we have definitely randomized the commenting. So sometimes when you're processing you are doing the summary, sometimes you are doing take away, sometimes you are doing chapters. That's fine. But for saving in Notion database, we always want the summary, always, nothing else. We don't want takeaways and chapters in the notion. So for that I really feel that you know like we can come up with a master prompt. To create a very structured summary for Notion separately. Or maybe use the same summary that can have chapter breakdown and summary and all the all of the information in that when they're saving it.
```

---

## 4. COMMENT GENERATION PROMPTS

These prompts convert the generated content (summary/chapters/takeaways) into natural YouTube comments.

**Location:** `backend/src/utils/prompt-templates.js` (lines 112-167)
**Function:** `getCommentPrompt(content, type, videoInfo)`

### 4.1 Summary Comment Prompt

**Purpose:** Converts summary into a natural 3-5 sentence YouTube comment
**Type:** `summary`

**Current Prompt:**
```
Create a helpful YouTube comment based on this video summary.

Video: {videoInfo.title}
Summary Content:
{content}

Requirements:
- 3-5 sentences maximum
- Highlight the main value of the video
- Sound natural and conversational
- Be encouraging and supportive
- Express genuine appreciation for the content
- Don't mention that you read a summary - write as if you watched the video
```

**YOUR FEEDBACK:**
```
[Add your feedback here]
```

### 4.2 Chapters Comment Prompt

**Purpose:** Converts chapter breakdown into a timestamp comment
**Type:** `chapters`

**Current Prompt:**
```
Create a YouTube comment with chapter timestamps to help viewers navigate this video.

Video: {videoInfo.title}
Chapter Breakdown:
{content}

Requirements:
- Start with a friendly intro line like "📍 Chapter Breakdown:" or "⏱️ Timestamps:"
- List each chapter with its timestamp in format [MM:SS] - Chapter Title
- Keep it clean, organized, and easy to scan
- Add a closing line expressing appreciation
- Maximum 8-10 chapters for readability
```

**YOUR FEEDBACK:**
```
[Add your feedback here]
```

### 4.3 Takeaways Comment Prompt

**Purpose:** Converts takeaways into a quick summary comment
**Type:** `takeaways`

**Current Prompt:**
```
Create a YouTube comment highlighting key takeaways from this video.

Video: {videoInfo.title}
Takeaways:
{content}

Requirements:
- Start with an engaging intro like "💡 Key Takeaways:" or "📝 Quick Summary:"
- List 3-5 most important takeaways (numbered or bulleted)
- Each point should be 1 line maximum
- End with a positive closing statement
- Make it valuable and easy to read quickly
```

**YOUR FEEDBACK:**
```
[Add your feedback here]
```

---

## 5. CHUNK COMBINATION PROMPT

**Purpose:** Combines multiple chunk summaries into one cohesive summary (for long videos)
**Location:** `backend/src/utils/prompt-templates.js` (lines 175-199)
**Function:** `getCombinePrompt()`

**Current Prompt:**
```
You have received multiple summaries of different parts of a YouTube video. Please combine them into a single, coherent, and comprehensive summary.

Video information:
Title: {videoInfo.title}
Channel: {videoInfo.channel}
URL: {videoInfo.url}

Individual chunk summaries:
=== Part 1 ===
{chunk1}

=== Part 2 ===
{chunk2}
...

Instructions:
1. Create a unified overview that captures the entire video flow
2. Organize key points logically by theme/topic (not by chunk order)
3. Remove any duplicate or redundant information
4. Preserve important timestamps from all parts
5. Create cohesive "Key Takeaways" section synthesizing insights from all parts
6. Ensure the final summary flows naturally as if it was created from the whole video at once
7. Format in clean, structured markdown

The final output should read as one comprehensive summary, not separate parts merged together.
```

**YOUR FEEDBACK:**
```
[Add your feedback here]
```

---

## 6. PROMO TEXTS

**Purpose:** Optional promotional text added to comments
**Location:** `youtube-extension/popup/popup.js` (lines 371-376)
**Can be customized in:** Extension settings

**Default Promo Texts:**
```
1. "This summary was generated with VideoSum AI"
2. "Generated chapter breakdown using www.videosum.ai"
3. "Want to summarize other videos? Search for VideoSum AI on Google"
4. "This breakdown was created by VideoSum - AI-powered video analysis"
```

**Settings:**
- `promoEnabled`: Whether to include promo text (default: true)
- `promoAllowNone`: Whether to allow comments without promo text (default: true)
- Position: Can be added at top or bottom of comment

**YOUR FEEDBACK:**
```
[Add your feedback here - should we change/remove promo texts? Change default behavior?]
```

---

## INSTRUCTIONS FOR PROVIDING FEEDBACK

1. **For each prompt**, fill in the "YOUR FEEDBACK" section with:
   - ✅ What works well (keep as-is)
   - ❌ What doesn't work (needs removal)
   - 🔄 What needs modification (explain how)
   - ➕ What's missing (suggestions to add)

2. **Priority levels:**
   - **HIGH:** Must change immediately
   - **MEDIUM:** Should change when possible
   - **LOW:** Nice to have improvements

3. **Example feedback format:**
   ```
   ✅ KEEP: The 10-20 key points structure is great
   ❌ REMOVE: "Format in clean markdown" - too vague
   🔄 MODIFY: Change "3-5 sentences maximum" to "2-3 sentences" for brevity
   ➕ ADD: Include instruction to mention specific timestamps in the comment
   Priority: HIGH

   Reasoning: Comments are getting too long and not engaging enough. Shorter,
   punchier comments with specific timestamps will drive more engagement.
   ```

4. **Save this file** when you're done and I'll implement all your changes.

---

## TECHNICAL DETAILS

### AI Model Configuration
- **Provider:** OpenRouter (configured in backend)
- **Default Model:** `google/gemini-flash-1.5-8b` (fast & cost-effective)
- **Max Tokens:** 4096
- **Temperature:** 0.7
- **Chunk Size:** 10,000 characters (20,000 for chapters)

### Processing Flow
1. Extension extracts YouTube transcript
2. Backend splits transcript into chunks if needed (>10k chars)
3. AI generates content (summary/chapters/takeaways)
4. If multi-chunk, combines chunk results
5. AI converts content into YouTube comment
6. Extension displays comment for user to post manually

### Current Comment Types Distribution
The system randomly selects one of 3 types:
- 33% Summary comments
- 33% Chapters comments
- 33% Takeaways comments

**YOUR FEEDBACK ON DISTRIBUTION:**
```
[Should we adjust these percentages? E.g., 50% chapters, 25% summary, 25% takeaways?]
```

---

## SUMMARY STATISTICS

**Total Prompts:** 6
- Summary Generation: 1
- Chapters Generation: 1
- Takeaways Generation: 1
- Comment Generation: 3 (summary, chapters, takeaways)
- Chunk Combination: 1

**Default Promo Texts:** 4

**Key Files:**
- `backend/src/utils/prompt-templates.js` - All prompts
- `backend/src/services/openrouter-service.js` - AI service
- `backend/src/routes/ai.js` - API endpoints
- `youtube-extension/popup/popup.js` - Extension settings
