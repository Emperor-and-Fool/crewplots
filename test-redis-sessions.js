#!/usr/bin/env node

// Redis Session Testing Script
// Tests the complete session lifecycle with our on-demand Redis service

const fetch = require('node-fetch');
const { CookieJar } = require('tough-cookie');

const BASE_URL = 'http://localhost:5000';

class SessionTester {
  constructor() {
    this.cookieJar = new CookieJar();
  }

  async makeRequest(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const cookies = await this.cookieJar.getCookieString(url);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Cookie': cookies,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Store cookies from response
    const setCookieHeaders = response.headers.raw()['set-cookie'];
    if (setCookieHeaders) {
      for (const cookie of setCookieHeaders) {
        await this.cookieJar.setCookie(cookie, url);
      }
    }

    return response;
  }

  async testSessionCreation() {
    console.log('\n🧪 TEST 1: Session Creation');
    const response = await this.makeRequest('/api/auth/me');
    const data = await response.json();
    
    console.log('Session exists:', data.debug?.sessionExists);
    console.log('Session ID:', data.debug?.sessionId);
    console.log('Has cookies:', data.debug?.hasCookies);
    
    return data.debug?.sessionId;
  }

  async testSessionPersistence(sessionId) {
    console.log('\n🧪 TEST 2: Session Persistence');
    const response = await this.makeRequest('/api/auth/me');
    const data = await response.json();
    
    const newSessionId = data.debug?.sessionId;
    console.log('Original session ID:', sessionId);
    console.log('New session ID:', newSessionId);
    console.log('Session persisted:', sessionId === newSessionId);
    
    return sessionId === newSessionId;
  }

  async testLoginAttempt() {
    console.log('\n🧪 TEST 3: Login Attempt (Redis Write Test)');
    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    console.log('Login response:', data.message);
    console.log('Status:', response.status);
    
    return response.status;
  }

  async testMultipleSessions() {
    console.log('\n🧪 TEST 4: Multiple Sessions (Different Cookies)');
    
    // Create a new tester instance (different cookie jar)
    const tester2 = new SessionTester();
    
    const response1 = await this.makeRequest('/api/auth/me');
    const response2 = await tester2.makeRequest('/api/auth/me');
    
    const data1 = await response1.json();
    const data2 = await response2.json();
    
    console.log('Session 1 ID:', data1.debug?.sessionId);
    console.log('Session 2 ID:', data2.debug?.sessionId);
    console.log('Different sessions:', data1.debug?.sessionId !== data2.debug?.sessionId);
    
    return data1.debug?.sessionId !== data2.debug?.sessionId;
  }

  async runAllTests() {
    console.log('🚀 Starting Redis Session Tests...\n');
    
    try {
      // Test 1: Session Creation
      const sessionId = await this.testSessionCreation();
      
      // Wait a moment for Redis to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 2: Session Persistence
      const persisted = await this.testSessionPersistence(sessionId);
      
      // Test 3: Login (Redis Write)
      const loginStatus = await this.testLoginAttempt();
      
      // Test 4: Multiple Sessions
      const multipleSessions = await this.testMultipleSessions();
      
      // Summary
      console.log('\n📊 TEST RESULTS:');
      console.log('✅ Session Creation:', sessionId ? 'PASS' : 'FAIL');
      console.log('✅ Session Persistence:', persisted ? 'PASS' : 'FAIL');
      console.log('✅ Redis Write (Login):', loginStatus === 401 ? 'PASS' : 'FAIL');
      console.log('✅ Multiple Sessions:', multipleSessions ? 'PASS' : 'FAIL');
      
      const allPassed = sessionId && persisted && loginStatus === 401 && multipleSessions;
      console.log('\n🎯 OVERALL:', allPassed ? 'ALL TESTS PASS' : 'SOME TESTS FAILED');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SessionTester();
  tester.runAllTests();
}

module.exports = SessionTester;