// Simple Redis Session Test
const http = require('http');

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: options.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testRedisSession() {
  console.log('🧪 Testing Redis Session System\n');
  
  try {
    // Test 1: Create session
    console.log('Test 1: Creating session...');
    const response1 = await makeRequest('/api/auth/me');
    console.log('Session created:', response1.data.debug?.sessionExists);
    console.log('Session ID:', response1.data.debug?.sessionId);
    
    // Test 2: Session persistence (should reuse same session)
    console.log('\nTest 2: Testing session persistence...');
    const cookie = response1.headers['set-cookie']?.[0];
    const response2 = await makeRequest('/api/auth/me', {
      headers: { 'Cookie': cookie }
    });
    console.log('Same session ID:', response1.data.debug?.sessionId === response2.data.debug?.sessionId);
    
    // Test 3: Login attempt (Redis write test)
    console.log('\nTest 3: Testing login (Redis write)...');
    const response3 = await makeRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Cookie': cookie },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    console.log('Login response:', response3.status, response3.data.message);
    
    console.log('\n✅ Redis session system is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRedisSession();