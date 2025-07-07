#!/usr/bin/env node

/**
 * Force logout script - Completely destroys all authentication state
 * Usage: node DevUtils/force-logout.js
 */

import http from 'http';

const forceLogout = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/dev-logout',
      method: 'GET',
      headers: {
        'User-Agent': 'Force-Logout-Script/1.0',
        'Accept': '*/*'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('✅ FORCE LOGOUT COMPLETED');
        console.log(`Status: ${res.statusCode}`);
        console.log('Headers:', res.headers);
        console.log('Session cookies cleared:', res.headers['set-cookie'] || 'None');
        resolve(data);
      });
    });

    req.on('error', (err) => {
      console.error('❌ Force logout failed:', err.message);
      reject(err);
    });

    req.end();
  });
};

// Execute force logout
console.log('🔄 FORCING COMPLETE LOGOUT...');
forceLogout()
  .then(() => {
    console.log('🎯 ALL AUTHENTICATION STATE DESTROYED');
    console.log('✨ You can now navigate to /login for fresh session');
  })
  .catch(err => {
    console.error('💥 Failed to force logout:', err);
    process.exit(1);
  });