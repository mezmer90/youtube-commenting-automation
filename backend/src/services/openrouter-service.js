// OpenRouter AI Service (Gemini Flash via OpenRouter)
const axios = require('axios');
const { splitIntoChunks } = require('../utils/transcript-chunker');
const {
    getSummaryPrompt,
    getChaptersPrompt,
    getTakeawaysPrompt,
    getCombinePrompt
} = require('../utils/prompt-templates');

class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        this.defaultModel = process.env.DEFAULT_AI_MODEL || 'google/gemini-flash-1.5-8b';
        this.maxTokens = parseInt(process.env.DEFAULT_MAX_TOKENS) || 4096;
        this.chunkSize = parseInt(process.env.DEFAULT_CHUNK_SIZE) || 10000; // Default 10,000 characters
    }

    /**
     * Generate AI summary from transcript with smart chunking
     * @param {string} transcript - Video transcript
     * @param {object} metadata - Video metadata
     * @returns {Promise<string>} - AI generated summary
     */
    async generateSummary(transcript, metadata = {}) {
        console.log(`📝 Generating summary for: ${metadata.title || 'Unknown'}`);
        console.log(`📊 Transcript length: ${transcript.length} characters`);

        // Split transcript into chunks if needed
        const chunks = splitIntoChunks(transcript, this.chunkSize);

        if (chunks.length === 1) {
            // Single chunk - process directly
            console.log('✅ Single chunk processing');
            const prompt = getSummaryPrompt(metadata, transcript, false);
            return await this.callAPI(prompt);
        }

        // Multi-chunk processing
        console.log(`📚 Multi-chunk processing: ${chunks.length} chunks`);
        const chunkSummaries = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`   Processing chunk ${i + 1}/${chunks.length} [${chunk.startTime} - ${chunk.endTime}]`);

            const chunkMetadata = {
                ...metadata,
                chunkInfo: `Part ${i + 1} of ${chunks.length} [${chunk.startTime} - ${chunk.endTime}]`
            };

            const prompt = getSummaryPrompt(chunkMetadata, chunk.text, true);
            const chunkSummary = await this.callAPI(prompt);
            chunkSummaries.push(chunkSummary);
        }

        // Combine all chunk summaries
        console.log('🔄 Combining chunk summaries...');
        const combinePrompt = getCombinePrompt(chunkSummaries, metadata);
        const finalSummary = await this.callAPI(combinePrompt);

        console.log('✅ Summary generation complete');
        return finalSummary;
    }

    /**
     * Generate chapter breakdown from transcript
     * @param {string} transcript - Video transcript with timestamps
     * @param {object} metadata - Video metadata
     * @returns {Promise<string>} - Chapter breakdown
     */
    async generateChapters(transcript, metadata = {}) {
        console.log(`📑 Generating chapters for: ${metadata.title || 'Unknown'}`);

        // For chapters, we use the full transcript (chapters need complete context)
        // But we can still chunk if it's extremely long
        const chunks = splitIntoChunks(transcript, this.chunkSize * 2); // Use 2x chunk size for chapters

        if (chunks.length === 1) {
            const prompt = getChaptersPrompt(metadata, transcript);
            return await this.callAPI(prompt);
        }

        // For multi-chunk, combine the transcript parts and process once
        console.log(`⚠️  Very long video (${chunks.length} chunks), processing in single pass with key sections`);
        const prompt = getChaptersPrompt(metadata, transcript);
        return await this.callAPI(prompt, { maxTokens: this.maxTokens * 1.5 });
    }

    /**
     * Extract key takeaways from transcript with smart chunking
     * @param {string} transcript - Video transcript
     * @param {object} metadata - Video metadata
     * @returns {Promise<string>} - Key takeaways
     */
    async generateTakeaways(transcript, metadata = {}) {
        console.log(`💡 Generating takeaways for: ${metadata.title || 'Unknown'}`);

        const chunks = splitIntoChunks(transcript, this.chunkSize);

        if (chunks.length === 1) {
            // Single chunk - process directly
            const prompt = getTakeawaysPrompt(metadata, transcript);
            return await this.callAPI(prompt);
        }

        // Multi-chunk processing - extract takeaways from each, then combine
        console.log(`📚 Multi-chunk processing: ${chunks.length} chunks`);
        const chunkTakeaways = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`   Processing chunk ${i + 1}/${chunks.length} [${chunk.startTime} - ${chunk.endTime}]`);

            const prompt = getTakeawaysPrompt(metadata, chunk.text);
            const takeaway = await this.callAPI(prompt);
            chunkTakeaways.push(takeaway);
        }

        // Combine and deduplicate takeaways
        console.log('🔄 Combining takeaways from all chunks...');
        const combinePrompt = `You have received key takeaways from different parts of a YouTube video. Please combine them into a single, unified list of the Top 5-7 Most Important Takeaways.

Video: ${metadata.title || 'Unknown'}

Takeaways from each section:
${chunkTakeaways.map((ta, idx) => `\n=== Part ${idx + 1} ===\n${ta}`).join('\n')}

Instructions:
1. Identify the most valuable and unique takeaways across all parts
2. Remove duplicates or very similar points
3. Combine related insights into stronger takeaways
4. Prioritize actionable and practical information
5. Format as a clean numbered list of 5-7 takeaways
6. Include relevant timestamps where these points are discussed
7. Each takeaway should be 1-2 sentences maximum`;

        const finalTakeaways = await this.callAPI(combinePrompt);
        console.log('✅ Takeaways generation complete');
        return finalTakeaways;
    }

    // NOTE: generateComment() method removed
    // We now post the full summary/chapters/takeaways directly as YouTube comments
    // No conversion step needed

    /**
     * Call OpenRouter API
     * @param {string} prompt - The prompt to send
     * @param {object} options - Additional options
     * @returns {Promise<string>} - AI response text
     */
    async callAPI(prompt, options = {}) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        const {
            model = this.defaultModel,
            maxTokens = this.maxTokens,
            temperature = 0.7
        } = options;

        try {
            console.log('🤖 OpenRouter API Request:', {
                model,
                promptLength: prompt.length,
                maxTokens
            });

            const response = await axios.post(
                this.endpoint,
                {
                    model,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: maxTokens,
                    temperature
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://github.com/mezmer90/youtube-commenting-automation',
                        'X-Title': 'YouTube Commenting Automation',
                        'Content-Type': 'application/json'
                    }
                }
            );

            const content = response.data.choices[0].message.content;
            const usage = response.data.usage;

            console.log('✅ OpenRouter API Success:', {
                outputLength: content.length,
                tokensUsed: usage?.total_tokens || 0
            });

            return content;

        } catch (error) {
            console.error('❌ OpenRouter API Error:', error.response?.data || error.message);
            throw new Error(`OpenRouter API failed: ${error.message}`);
        }
    }
}

module.exports = OpenRouterService;
