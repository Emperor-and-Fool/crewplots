#!/usr/bin/env node

/**
 * Redis Log Cleaner - Automatically removes Redis log files every 30 seconds
 * This prevents log files from accumulating when Redis fails to start
 */

const fs = require('fs');
const path = require('path');

const REDIS_LOG_PATH = path.join(__dirname, '..', 'logs', 'redis', 'redis-server.log');
const CLEANUP_INTERVAL = 30000; // 30 seconds

function cleanRedisLog() {
  try {
    if (fs.existsSync(REDIS_LOG_PATH)) {
      const stats = fs.statSync(REDIS_LOG_PATH);
      const fileSizeKB = Math.round(stats.size / 1024);
      
      fs.unlinkSync(REDIS_LOG_PATH);
      console.log(`[LogCleaner] Cleaned Redis log file (${fileSizeKB}KB removed)`);
    }
  } catch (error) {
    console.log(`[LogCleaner] Error cleaning Redis log:`, error.message);
  }
}

function startLogCleaner() {
  console.log(`[LogCleaner] Starting Redis log cleaner (${CLEANUP_INTERVAL/1000}s interval)`);
  
  // Clean immediately on start
  cleanRedisLog();
  
  // Set up recurring cleanup
  setInterval(cleanRedisLog, CLEANUP_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[LogCleaner] Shutting down Redis log cleaner...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[LogCleaner] Shutting down Redis log cleaner...');
  process.exit(0);
});

if (require.main === module) {
  startLogCleaner();
}

module.exports = { cleanRedisLog, startLogCleaner };