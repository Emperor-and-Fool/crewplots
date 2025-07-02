// Simple test for ValidationEngine 3.0 DataAggregationEngine
import fetch from 'node-fetch';
import fs from 'fs';

async function testValidationV3() {
  try {
    // Read cookies for authentication
    let cookies = '';
    try {
      cookies = fs.readFileSync('cookies.txt', 'utf8');
    } catch (err) {
      console.log('No cookies found, will use empty cookie');
    }

    console.log('Testing ValidationEngine 3.0 DataAggregationEngine...');
    
    // Test the test endpoint
    const response = await fetch('http://localhost:5000/api/validation/v3/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });

    console.log('Status:', response.status);
    console.log('Headers:', response.headers.raw());
    
    if (response.status === 401) {
      console.log('Authentication required - please log in first');
      return;
    }

    const text = await response.text();
    console.log('Response:', text);

    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const data = JSON.parse(text);
        console.log('Parsed JSON:', JSON.stringify(data, null, 2));
      } catch (err) {
        console.log('Failed to parse JSON:', err.message);
      }
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testValidationV3();