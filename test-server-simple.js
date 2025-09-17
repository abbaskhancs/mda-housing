const axios = require('axios');

async function testServer() {
  try {
    console.log('Testing server health...');
    const response = await axios.get('http://localhost:3001/health');
    console.log('✅ Server is running!');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server is not responding');
    console.log('Error:', error.message);
    return false;
  }
}

testServer();
