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
    const channelName = videoInfo.channel || 'The creator';

    return `You are writing a comprehensive summary of a YouTube video that will be posted as a comment. Output ONLY the summary content itself - no preamble, no meta-commentary, no introductions like "Here's a summary" or "This is a breakdown". Start directly with the content.

Video information:
Title: ${videoInfo.title || 'Unknown'}
Channel: ${videoInfo.channel || 'Unknown'}
URL: ${videoInfo.url || 'Unknown'}
Duration: ${videoInfo.duration || 'Unknown'}
${chunkNote}

Raw YouTube transcript data:
${transcript}

WRITING STYLE REQUIREMENTS:
- Write naturally like a human, not an AI
- Use simple, clear English (Grade 10-12 reading level)
- Write in third person perspective: "This video covers...", "${channelName} explains...", "This tutorial shows..."
- Use "this video" not "the video" or "that video" - be professional and direct
- Refer to the channel/creator by name when relevant: "${channelName} says..." or "${channelName} mentions..."
- NO AI-sounding words: avoid "delve", "leverage", "moreover", "furthermore", "comprehensive", "robust", "utilize", "facilitate", "elucidate", "here's the kicker"
- Sound conversational and genuine

FORMATTING REQUIREMENTS - CRITICAL:
- Use ## for section headers (e.g., ## Key Points, ## Main Takeaways)
- Use - for bullet points (not • or other symbols)
- Include timestamps in [MM:SS] or [HH:MM:SS] format for every relevant point
- Use numbered lists (1., 2., 3.) where appropriate
- Use simple, classy emojis sparingly (✓, →, ⏰, 📌, etc.)
- ABSOLUTELY NO **bold** OR *italic* MARKDOWN - this looks ugly in YouTube comments
- Do NOT use asterisks for emphasis - write plain text only
- Keep formatting clean and easy to read

CONTENT DEPTH REQUIREMENTS - MAKE IT RICH AND DETAILED:
- This is for LEARNING - provide deep, detailed explanations, not shallow bullet points
- Cover ALL important points with FULL CONTEXT and EXPLANATIONS
- Don't just list topics - EXPLAIN them thoroughly with details, examples, and reasoning
- If the video has steps (how-to), include ALL steps with detailed instructions and timestamps
- If the video is a listicle, include ALL list items with full explanations, not just titles
- If the video has key concepts, include ALL of them with comprehensive explanations - what they are, why they matter, how they work
- Include direct quotes when impactful
- Highlight important statistics, facts, or data points with context
- Add actionable takeaways where relevant with specific guidance
- Provide definitions, examples, and elaboration - make it educational
- Ensure every major point has a timestamp
- NEVER sacrifice depth for brevity - viewers want to learn, not skim

STRUCTURE:
Organize the summary logically based on the video content. The structure should adapt to the video type:
- For how-to videos: Step-by-step breakdown with timestamps
- For listicles: Complete list with all items
- For educational content: Main concepts with explanations
- For discussions: Key points and arguments made

CRITICAL: Output ONLY the summary content. Do NOT write "Here's a summary" or "This is a breakdown" or any meta-commentary. Start immediately with the content (e.g., start with a ## header or the first point).`;
}

/**
 * Get chapter breakdown prompt
 * @param {object} videoInfo - Video metadata
 * @param {string} transcript - Video transcript with timestamps
 * @returns {string} Formatted prompt
 */
function getChaptersPrompt(videoInfo, transcript) {
    const channelName = videoInfo.channel || 'The creator';

    return `You are writing a chapter breakdown for a YouTube video that will be posted as a comment. Output ONLY the chapter content itself - start directly with a simple professional intro like "This video covers these chapters:" followed by the chapter list.

Video information:
Title: ${videoInfo.title || 'Unknown'}
Channel: ${videoInfo.channel || 'Unknown'}
Duration: ${videoInfo.duration || 'Unknown'}

Transcript with timestamps:
${transcript}

WRITING STYLE REQUIREMENTS:
- Write naturally like a human, not an AI
- Use simple, clear English (Grade 10-12 reading level)
- Write in third person perspective: "This video covers...", "${channelName} explains...", "This tutorial shows..."
- Use "this video" not "the video" or "that video" - be professional and direct
- Refer to the creator by name when relevant: "${channelName}"
- NO AI-sounding words: avoid "delve", "leverage", "moreover", "furthermore", "comprehensive", "robust", "utilize", "facilitate", "elucidate", "here's the kicker"
- Sound conversational and helpful

FORMATTING REQUIREMENTS - CRITICAL:
- Start with a simple intro: "This video covers these chapters:" (or similar)
- Format each chapter as: [MM:SS] Chapter Title
- Use - for bullet points if adding descriptions
- Use simple, classy emojis sparingly (⏰, 📌, →, etc.)
- ABSOLUTELY NO **bold** OR *italic* MARKDOWN - this looks ugly in YouTube comments
- Do NOT use asterisks for emphasis - write plain text only
- Keep it clean and easy to scan

CONTENT DEPTH REQUIREMENTS:
- Include ALL meaningful chapters - don't limit yourself to a specific number
- For listicle videos: Create a chapter for each list item
- For how-to videos: Create a chapter for each step/section
- For educational videos: Create chapters based on natural topic changes
- Start with [0:00] for Introduction or earliest timestamp
- Each chapter title should be clear and descriptive (5-12 words)
- Add a detailed 2-3 sentence description under each chapter explaining what's covered with full context
- Ensure chapters cover the entire video from start to finish
- Use actual timestamps from the transcript
- Make descriptions rich and informative - explain what viewers will learn, not just topic titles

STRUCTURE:
Organize chapters to match the natural flow of the video. Adapt the structure based on video type:
- For listicles: One chapter per list item
- For tutorials: Chapters for intro, setup, each step, conclusion
- For discussions: Chapters for intro, main topics discussed, conclusion
- For reviews: Chapters for intro, features, pros/cons, verdict

CRITICAL: Start with a simple professional intro like "This video covers these chapters:" then go immediately into the chapter list. Do NOT write "Here's a chapter breakdown" or numbered headers like "## Chapter Breakdown".`;
}

/**
 * Get key takeaways prompt
 * @param {object} videoInfo - Video metadata
 * @param {string} transcript - Video transcript
 * @returns {string} Formatted prompt
 */
function getTakeawaysPrompt(videoInfo, transcript) {
    const channelName = videoInfo.channel || 'The creator';

    return `You are writing a list of key takeaways from a YouTube video that will be posted as a comment. Output ONLY the takeaways content itself - no preamble, no meta-commentary. Start directly with a simple professional intro line like "This video covers these key takeaways:" followed by the numbered list.

Video information:
Title: ${videoInfo.title || 'Unknown'}
Channel: ${videoInfo.channel || 'Unknown'}

Transcript:
${transcript}

WRITING STYLE REQUIREMENTS:
- Write naturally like a human, not an AI
- Use simple, clear English (Grade 10-12 reading level)
- Write in third person perspective: "This video explains...", "${channelName} shows...", "This tutorial covers..."
- Use "this video" not "the video" or "that video" - be professional and direct
- Refer to the creator by name when relevant: "${channelName}"
- NO AI-sounding words: avoid "delve", "leverage", "moreover", "furthermore", "comprehensive", "robust", "utilize", "facilitate", "elucidate", "here's the kicker"
- Sound conversational and helpful

FORMATTING REQUIREMENTS - CRITICAL:
- Start with a simple intro line: "This video covers these key takeaways:" (or similar professional phrasing)
- Use numbered lists (1., 2., 3.) for each takeaway
- Include timestamps in [MM:SS] or [HH:MM:SS] format for every point
- Use simple, classy emojis sparingly (✓, →, 📌, 💡, etc.)
- ABSOLUTELY NO **bold** OR *italic* MARKDOWN - this looks ugly in YouTube comments
- Do NOT use asterisks for emphasis - write plain text only
- Keep it clean and easy to read

CONTENT DEPTH REQUIREMENTS - MAKE IT RICH AND DETAILED:
- Include ALL important takeaways - don't limit yourself to a specific number
- Each takeaway should be 2-4 sentences with DEEP explanations and FULL CONTEXT
- Don't just state the takeaway - EXPLAIN it thoroughly with details, reasoning, and examples
- Focus on actionable insights with specific, practical guidance viewers can apply
- Include relevant timestamps where each point is discussed
- Include key concepts, strategies, tips, and insights with comprehensive explanations
- Add context, definitions, and elaboration - make each takeaway educational and valuable
- Explain WHY each point matters and HOW to apply it
- NEVER sacrifice depth for brevity - viewers want to learn, not skim

STRUCTURE:
Start with: "This video covers these key takeaways:" (or similar professional intro)
Then format as a numbered list with timestamps. Each entry should be comprehensive:
1. [TIMESTAMP] Main takeaway title - Detailed 2-4 sentence explanation with full context, reasoning, examples, and actionable guidance.

CRITICAL: Start with a professional intro line like "This video covers these key takeaways:" then go immediately into the numbered list. Do NOT write "Here are the Top 7..." or "Here's what I learned" or numbered headers like "## Key Takeaways".`;
}

// NOTE: getCommentPrompt() has been removed
// The full summary/chapters/takeaways content is now posted directly as YouTube comments
// No conversion step needed - we post the complete generated content as-is

/**
 * Get chunk combination prompt (for multi-chunk processing)
 * @param {Array<string>} chunkSummaries - Array of individual chunk summaries
 * @param {object} videoInfo - Video metadata
 * @returns {string} Formatted prompt
 */
function getCombinePrompt(chunkSummaries, videoInfo = {}) {
    const channelName = videoInfo.channel || 'The creator';

    return `You have received multiple summaries from different parts of a YouTube video. Your task is to combine them into ONE seamless, cohesive, and complete summary that reads naturally from start to finish.

Video information:
Title: ${videoInfo.title || 'Unknown'}
Channel: ${videoInfo.channel || 'Unknown'}
URL: ${videoInfo.url || 'Unknown'}

Individual chunk summaries:
${chunkSummaries.map((summary, index) => `
=== Part ${index + 1} ===
${summary}
`).join('\n')}

CRITICAL REQUIREMENTS:
1. The final output MUST read as ONE unified summary, not separate chunks merged together
2. Remove ALL references to "Part 1", "Part 2", "chunk", "section" - this should feel like one complete summary
3. Organize content logically by theme/topic/chronology - NOT by chunk order
4. Remove any duplicate or overlapping information across chunks
5. Preserve ALL important timestamps from all parts
6. Ensure smooth transitions between topics - no abrupt breaks that reveal chunk boundaries
7. Keep ALL important information - don't lose any valuable content while combining

WRITING STYLE:
- Write naturally like a human, not an AI
- Use simple, clear English (Grade 10-12 reading level)
- Write in third person perspective (e.g., "${channelName} explains...", "The video covers...")
- NO AI-sounding words: avoid "delve", "leverage", "moreover", "furthermore", "comprehensive", "robust", "utilize", "facilitate", "elucidate", "here's the kicker"
- Sound conversational and genuine

FORMATTING:
- Use ## for section headers
- Use - for bullet points
- Use numbered lists (1., 2., 3.) where appropriate
- Include ALL timestamps in [MM:SS] or [HH:MM:SS] format
- Use simple, classy emojis sparingly (✓, →, ⏰, 📌, etc.)
- NO markdown styling like **bold** or *italic*

The final output should look exactly like it was created from the complete video in one pass - completely seamless with no evidence of chunking. Make it valuable, complete, and natural.`;
}

module.exports = {
    getSummaryPrompt,
    getChaptersPrompt,
    getTakeawaysPrompt,
    getCombinePrompt
    // Note: getCommentPrompt removed - we now post full content directly
};
