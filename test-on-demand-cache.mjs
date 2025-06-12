#!/usr/bin/env node

// Test script for on-demand cache service
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function testCacheService() {
  console.log('🧪 Testing On-Demand Cache Service');
  console.log('=====================================\n');

  try {
    // Test 1: Cache Status
    console.log('1. Testing cache status...');
    const statusResponse = await fetch(`${BASE_URL}/cache/status`);
    const statusData = await statusResponse.json();
    console.log('Status:', JSON.stringify(statusData, null, 2));
    console.log('✅ Cache status test completed\n');

    // Test 2: Basic cache performance
    console.log('2. Testing basic cache performance...');
    const testResponse = await fetch(`${BASE_URL}/cache/test`);
    const testData = await testResponse.json();
    console.log('Performance test:', JSON.stringify(testData, null, 2));
    console.log('✅ Basic cache performance test completed\n');

    // Test 3: Session caching
    console.log('3. Testing session caching...');
    const sessionResponse = await fetch(`${BASE_URL}/cache/session/test`, {
      method: 'POST'
    });
    const sessionData = await sessionResponse.json();
    console.log('Session test:', JSON.stringify(sessionData, null, 2));
    console.log('✅ Session caching test completed\n');

    // Test 4: Batch operations
    console.log('4. Testing batch operations...');
    const batchResponse = await fetch(`${BASE_URL}/cache/batch/test`, {
      method: 'POST'
    });
    const batchData = await batchResponse.json();
    console.log('Batch test:', JSON.stringify(batchData, null, 2));
    console.log('✅ Batch operations test completed\n');

    // Final status check
    console.log('5. Final status check...');
    const finalStatusResponse = await fetch(`${BASE_URL}/cache/status`);
    const finalStatusData = await finalStatusResponse.json();
    console.log('Final status:', JSON.stringify(finalStatusData, null, 2));

    console.log('\n🎉 All cache tests completed successfully!');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCacheService();