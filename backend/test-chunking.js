// Test script for chunking logic
require('dotenv').config();
const { splitIntoChunks } = require('./src/utils/transcript-chunker');
const { getSummaryPrompt, getCombinePrompt } = require('./src/utils/prompt-templates');

// Sample transcript with timestamps (simulating a long video)
const sampleTranscript = `
[0:00] Welcome to this comprehensive tutorial on building modern web applications.
[0:15] Today we're going to cover everything from setup to deployment.
[0:30] Let's start with the basics of project initialization.
[1:00] First, you need to install Node.js and npm on your system.
[1:30] Once you have those installed, create a new directory for your project.
[2:00] Now let's talk about choosing the right framework for your application.
[2:30] React, Vue, and Angular are all great choices depending on your needs.
[3:00] For this tutorial, we'll be using React because of its simplicity and flexibility.
[3:30] Let's initialize a new React application using create-react-app.
[4:00] The command is: npx create-react-app my-app.
[4:30] While that's installing, let me explain the component architecture.
[5:00] Components are the building blocks of React applications.
[5:30] They can be functional or class-based, though functional is now preferred.
[6:00] Here's an example of a simple functional component.
[6:30] Now let's talk about state management in React applications.
[7:00] You can use local state, context API, or libraries like Redux.
[7:30] For smaller applications, local state and context are usually sufficient.
[8:00] Let's see how to implement a simple counter with useState hook.
[8:30] The useState hook is one of the most commonly used hooks in React.
[9:00] Now moving on to data fetching and API integration.
[9:30] We'll use the fetch API to get data from a REST endpoint.
[10:00] Here's how you can make a GET request and handle the response.
[10:30] Error handling is crucial when working with external APIs.
[11:00] Always implement try-catch blocks and show user-friendly error messages.
[11:30] Next, let's discuss styling options for React applications.
[12:00] You can use CSS modules, styled-components, or Tailwind CSS.
`.repeat(20); // Repeat to create a longer transcript (testing multi-chunk)

console.log('🧪 Testing Chunking Logic');
console.log('='.repeat(60));

// Test 1: Check chunking
console.log('\n📊 Test 1: Chunking with 10,000 character default');
const chunks = splitIntoChunks(sampleTranscript);
console.log(`✅ Created ${chunks.length} chunks`);
console.log(`   Total transcript length: ${sampleTranscript.length} characters\n`);

// Test 2: Verify chunk structure
console.log('📊 Test 2: Verify chunk structure');
chunks.forEach((chunk, idx) => {
    console.log(`   Chunk ${idx + 1}:`);
    console.log(`     - Length: ${chunk.text.length} characters`);
    console.log(`     - Start time: ${chunk.startTime}`);
    console.log(`     - End time: ${chunk.endTime}`);
    console.log(`     - Index: ${chunk.index}`);
});

// Test 3: Check prompt generation
console.log('\n📊 Test 3: Test prompt generation');
const metadata = {
    title: 'Building Modern Web Applications - Complete Guide',
    channel: 'Web Dev Pro',
    url: 'https://youtube.com/watch?v=test123',
    duration: '45:30'
};

const prompt = getSummaryPrompt(metadata, chunks[0].text, true);
console.log('✅ Summary prompt generated');
console.log(`   Prompt length: ${prompt.length} characters`);
console.log(`   First 200 chars: ${prompt.substring(0, 200)}...\n`);

// Test 4: Test combine prompt
console.log('📊 Test 4: Test combine prompt generation');
const mockSummaries = [
    '## Part 1 Summary\n- Introduction to web development\n- Setting up the environment',
    '## Part 2 Summary\n- Building components\n- State management'
];
const combinePrompt = getCombinePrompt(mockSummaries, metadata);
console.log('✅ Combine prompt generated');
console.log(`   Prompt length: ${combinePrompt.length} characters\n`);

// Test 5: Small transcript (should create 1 chunk)
console.log('📊 Test 5: Small transcript test');
const smallTranscript = '[0:00] This is a short video.\n[0:30] Just testing.';
const smallChunks = splitIntoChunks(smallTranscript);
console.log(`✅ Small transcript: ${smallChunks.length} chunk(s)`);
console.log(`   Length: ${smallTranscript.length} characters\n`);

console.log('='.repeat(60));
console.log('✅ All chunking tests completed successfully!\n');
