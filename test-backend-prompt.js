// Test backend AI generation
const axios = require('axios');

const testTranscript = `
[0:00] Hey everyone, welcome to this tutorial
[0:15] Today we're going to learn about machine learning
[0:30] First, let's talk about what ML is
[0:45] Machine learning is a subset of artificial intelligence
[1:00] It allows computers to learn from data
[1:15] There are three main types of machine learning
[1:30] Supervised learning uses labeled data
[1:45] Unsupervised learning finds patterns in unlabeled data
[2:00] Reinforcement learning learns through trial and error
`;

async function testBackend() {
  try {
    console.log('🧪 Testing backend AI generation...\n');

    const response = await axios.post(
      'https://youtube-commenting-automation-production.up.railway.app/api/ai/process',
      {
        transcript: testTranscript,
        metadata: {
          title: 'Machine Learning Tutorial',
          channel: 'Tech Academy',
          url: 'https://youtube.com/watch?v=test123',
          duration: '2:00'
        },
        comment_type: 'summary' // Force summary type
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Response received:\n');
    console.log('Comment Type:', response.data.comment_type);
    console.log('\n📝 Generated Comment:\n');
    console.log(response.data.comment);
    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testBackend();
