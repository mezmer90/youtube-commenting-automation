// AI Prompt Templates
// Extracted from youtube-summarizer-v8.0-stripe extension
// These prompts have been proven to generate quality, actionable content

/**
 * Get comprehensive summary prompt
 * @param {object} videoInfo - Video metadata (title, channel, url, duration)
 * @param {string} transcript - Video transcript (can be chunk or full)
 * @param {boolean} isChunk - Whether this is a chunk or full transcript
 * @returns {string} Formatted prompt
 */
function getSummaryPrompt(videoInfo, transcript, isChunk = false) {
    const chunkNote = isChunk ? '\n\nNote: This is part of a longer video. Focus on the content in this section while being aware it\'s part of a larger context.' : '';

    return `Create a comprehensive bullet-point summary of this YouTube video with timestamps and actionable takeaways.

Video information:
Title: ${videoInfo.title || 'Unknown'}
Channel: ${videoInfo.channel || 'Unknown'}
URL: ${videoInfo.url || 'Unknown'}
Duration: ${videoInfo.duration || 'Unknown'}
${chunkNote}

Raw YouTube transcript data:
${transcript}

Instructions:
1. Format your response in clean markdown
2. Include 10-20 key points from the video, each with its relevant timestamp
3. For each main point, add 1-3 actionable takeaways or practical applications
4. Highlight important quotes, facts, or statistics when relevant
5. End with a "Key Takeaways" section of 3-5 bullet points summarizing the most practical information
6. Keep the formatting clean and consistent for easy reading
7. Focus on information that would be most useful to someone wanting to implement the content`;
}

/**
 * Get chapter breakdown prompt
 * @param {object} videoInfo - Video metadata
 * @param {string} transcript - Video transcript with timestamps
 * @returns {string} Formatted prompt
 */
function getChaptersPrompt(videoInfo, transcript) {
    return `Analyze this YouTube video transcript and create a detailed chapter breakdown with timestamps.

Video information:
Title: ${videoInfo.title || 'Unknown'}
Channel: ${videoInfo.channel || 'Unknown'}
Duration: ${videoInfo.duration || 'Unknown'}

Transcript with timestamps:
${transcript}

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
Real-world examples and how to apply the concept`;
}

/**
 * Get key takeaways prompt
 * @param {object} videoInfo - Video metadata
 * @param {string} transcript - Video transcript
 * @returns {string} Formatted prompt
 */
function getTakeawaysPrompt(videoInfo, transcript) {
    return `Extract the most valuable and actionable takeaways from this YouTube video transcript.

Video information:
Title: ${videoInfo.title || 'Unknown'}
Channel: ${videoInfo.channel || 'Unknown'}

Transcript:
${transcript}

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
...`;
}

/**
 * Get comment generation prompt for YouTube
 * @param {string} content - The summary/chapters/takeaways content
 * @param {string} type - Type of comment (summary, chapters, takeaways)
 * @param {object} videoInfo - Video metadata
 * @returns {string} Formatted prompt
 */
function getCommentPrompt(content, type, videoInfo = {}) {
    let specificInstructions = '';

    switch (type) {
        case 'summary':
            specificInstructions = `Create a helpful YouTube comment based on this video summary.

Video: ${videoInfo.title || 'Unknown'}
Summary Content:
${content}

Requirements:
- 3-5 sentences maximum
- Highlight the main value of the video
- Sound natural and conversational
- Be encouraging and supportive
- Express genuine appreciation for the content
- Don't mention that you read a summary - write as if you watched the video`;
            break;

        case 'chapters':
            specificInstructions = `Create a YouTube comment with chapter timestamps to help viewers navigate this video.

Video: ${videoInfo.title || 'Unknown'}
Chapter Breakdown:
${content}

Requirements:
- Start with a friendly intro line like "📍 Chapter Breakdown:" or "⏱️ Timestamps:"
- List each chapter with its timestamp in format [MM:SS] - Chapter Title
- Keep it clean, organized, and easy to scan
- Add a closing line expressing appreciation
- Maximum 8-10 chapters for readability`;
            break;

        case 'takeaways':
            specificInstructions = `Create a YouTube comment highlighting key takeaways from this video.

Video: ${videoInfo.title || 'Unknown'}
Takeaways:
${content}

Requirements:
- Start with an engaging intro like "💡 Key Takeaways:" or "📝 Quick Summary:"
- List 3-5 most important takeaways (numbered or bulleted)
- Each point should be 1 line maximum
- End with a positive closing statement
- Make it valuable and easy to read quickly`;
            break;

        default:
            throw new Error(`Unknown comment type: ${type}`);
    }

    return specificInstructions;
}

/**
 * Get chunk combination prompt (for multi-chunk processing)
 * @param {Array<string>} chunkSummaries - Array of individual chunk summaries
 * @param {object} videoInfo - Video metadata
 * @returns {string} Formatted prompt
 */
function getCombinePrompt(chunkSummaries, videoInfo = {}) {
    return `You have received multiple summaries of different parts of a YouTube video. Please combine them into a single, coherent, and comprehensive summary.

Video information:
Title: ${videoInfo.title || 'Unknown'}
Channel: ${videoInfo.channel || 'Unknown'}
URL: ${videoInfo.url || 'Unknown'}

Individual chunk summaries:
${chunkSummaries.map((summary, index) => `
=== Part ${index + 1} ===
${summary}
`).join('\n')}

Instructions:
1. Create a unified overview that captures the entire video flow
2. Organize key points logically by theme/topic (not by chunk order)
3. Remove any duplicate or redundant information
4. Preserve important timestamps from all parts
5. Create cohesive "Key Takeaways" section synthesizing insights from all parts
6. Ensure the final summary flows naturally as if it was created from the whole video at once
7. Format in clean, structured markdown

The final output should read as one comprehensive summary, not separate parts merged together.`;
}

module.exports = {
    getSummaryPrompt,
    getChaptersPrompt,
    getTakeawaysPrompt,
    getCommentPrompt,
    getCombinePrompt
};
