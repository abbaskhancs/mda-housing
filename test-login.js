const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login...');
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@mda.gov.pk',
      password: 'password123'
    });
    
    console.log('Login successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testLogin();
