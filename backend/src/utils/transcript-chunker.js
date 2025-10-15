// Transcript Chunking Utility
// Extracted from youtube-summarizer-v8.0-stripe extension
// Intelligently splits transcripts while preserving timestamps and context

/**
 * Split transcript into manageable chunks while preserving timestamps
 * @param {string} transcript - Full video transcript with timestamps
 * @param {number} maxChunkSize - Maximum size of each chunk in characters (default: 10000)
 * @returns {Array<Object>} Array of chunk objects with text, startTime, endTime, and index
 */
function splitIntoChunks(transcript, maxChunkSize = 10000) {
    const chunks = [];
    const lines = transcript.split('\n');
    let currentChunk = '';
    let currentStartTime = null;
    let currentEndTime = null;

    for (const line of lines) {
        // Extract timestamp from line (format: [MM:SS] or [HH:MM:SS])
        const timestampMatch = line.match(/\[(\d+:\d+(?::\d+)?)\]/);

        if (timestampMatch) {
            // Track first timestamp in chunk
            if (!currentStartTime) {
                currentStartTime = timestampMatch[1];
            }
            // Always update end time
            currentEndTime = timestampMatch[1];
        }

        // Check if adding this line would exceed chunk size
        if (currentChunk.length + line.length > maxChunkSize && currentChunk) {
            // Save current chunk
            chunks.push({
                text: currentChunk.trim(),
                startTime: currentStartTime || '0:00',
                endTime: currentEndTime || '0:00',
                index: chunks.length
            });

            // Start new chunk with current line
            currentChunk = line;
            currentStartTime = currentEndTime; // Continue from where we left off
        } else {
            // Add line to current chunk
            currentChunk += (currentChunk ? '\n' : '') + line;
        }
    }

    // Add final chunk if there's remaining content
    if (currentChunk.trim()) {
        chunks.push({
            text: currentChunk.trim(),
            startTime: currentStartTime || '0:00',
            endTime: currentEndTime || '0:00',
            index: chunks.length
        });
    }

    console.log(`📄 Split transcript into ${chunks.length} chunks`);
    chunks.forEach((chunk, i) => {
        console.log(`   Chunk ${i + 1}: ${chunk.text.length} chars [${chunk.startTime} - ${chunk.endTime}]`);
    });

    return chunks;
}

/**
 * Combine multiple chunk summaries into a single coherent summary
 * @param {Array<string>} chunkSummaries - Array of individual chunk summaries
 * @returns {string} Combined summary prompt
 */
function createCombinePrompt(chunkSummaries) {
    return `You have received multiple summaries of different parts of a YouTube video. Please combine them into a single, coherent, and comprehensive summary.

Here are the individual chunk summaries:

${chunkSummaries.map((summary, index) => `
=== Part ${index + 1} ===
${summary}
`).join('\n')}

Please provide:
1. A unified overview that captures the entire video
2. Key points organized logically (not by chunk)
3. Main takeaways that span across all parts
4. A cohesive conclusion

Format the output in clear, structured markdown.`;
}

module.exports = {
    splitIntoChunks,
    createCombinePrompt
};
