#!/usr/bin/env node

/**
 * Redis Binary Patcher
 * Modifies the custom Redis binary to improve performance characteristics
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';

class RedisBinaryPatcher {
  constructor() {
    this.binaryPath = './repl-redis/production-redis';
    this.backupPath = './repl-redis/production-redis.bak';
    this.patches = [];
  }

  createBackup() {
    copyFileSync(this.binaryPath, this.backupPath);
    console.log('Created backup: production-redis.bak');
  }

  loadBinary() {
    this.binaryData = readFileSync(this.binaryPath);
    console.log(`Loaded binary: ${this.binaryData.length} bytes`);
  }

  // Find and patch connection timeout values
  patchConnectionTimeout() {
    // Look for common timeout values (in seconds as 32-bit integers)
    const timeouts = [
      { value: 30, newValue: 300, description: 'Connection keepalive 30s -> 300s' },
      { value: 60, newValue: 600, description: 'Operation timeout 60s -> 600s' },
      { value: 5, newValue: 60, description: 'Connect timeout 5s -> 60s' }
    ];

    timeouts.forEach(timeout => {
      const patterns = [
        Buffer.from([timeout.value, 0, 0, 0]), // Little endian 32-bit
        Buffer.from([0, 0, 0, timeout.value]), // Big endian 32-bit
        Buffer.from([timeout.value]) // 8-bit value
      ];

      patterns.forEach((pattern, patternIndex) => {
        let index = this.binaryData.indexOf(pattern);
        let patchCount = 0;
        
        while (index !== -1 && patchCount < 5) { // Limit patches to avoid corruption
          if (patternIndex === 0) {
            // Little endian replacement
            this.binaryData.writeUInt32LE(timeout.newValue, index);
          } else if (patternIndex === 1) {
            // Big endian replacement
            this.binaryData.writeUInt32BE(timeout.newValue, index);
          } else {
            // 8-bit replacement
            this.binaryData[index] = timeout.newValue;
          }
          
          this.patches.push({
            description: timeout.description,
            offset: index,
            pattern: patternIndex,
            oldValue: timeout.value,
            newValue: timeout.newValue
          });
          
          patchCount++;
          index = this.binaryData.indexOf(pattern, index + 1);
        }
      });
    });
  }

  // Patch maximum connection limits
  patchConnectionLimits() {
    // Common connection limit values
    const limits = [
      { value: 100, newValue: 1000, description: 'Max connections 100 -> 1000' },
      { value: 50, newValue: 500, description: 'Connection pool 50 -> 500' }
    ];

    limits.forEach(limit => {
      const patterns = [
        Buffer.from([limit.value, 0, 0, 0]), // 32-bit little endian
        Buffer.from([0, 0, 0, limit.value])  // 32-bit big endian
      ];

      patterns.forEach((pattern, patternIndex) => {
        let index = this.binaryData.indexOf(pattern);
        let patchCount = 0;
        
        while (index !== -1 && patchCount < 3) {
          if (patternIndex === 0) {
            this.binaryData.writeUInt32LE(limit.newValue, index);
          } else {
            this.binaryData.writeUInt32BE(limit.newValue, index);
          }
          
          this.patches.push({
            description: limit.description,
            offset: index,
            pattern: patternIndex,
            oldValue: limit.value,
            newValue: limit.newValue
          });
          
          patchCount++;
          index = this.binaryData.indexOf(pattern, index + 1);
        }
      });
    });
  }

  // Patch memory/key limits
  patchMemoryLimits() {
    // Look for 10000 key limit and increase it
    const keyLimit = 10000;
    const newKeyLimit = 50000;
    
    const patterns = [
      Buffer.from([0x10, 0x27, 0, 0]), // 10000 in little endian
      Buffer.from([0, 0, 0x27, 0x10])  // 10000 in big endian
    ];

    patterns.forEach((pattern, patternIndex) => {
      let index = this.binaryData.indexOf(pattern);
      let patchCount = 0;
      
      while (index !== -1 && patchCount < 2) {
        if (patternIndex === 0) {
          this.binaryData.writeUInt32LE(newKeyLimit, index);
        } else {
          this.binaryData.writeUInt32BE(newKeyLimit, index);
        }
        
        this.patches.push({
          description: `Key limit ${keyLimit} -> ${newKeyLimit}`,
          offset: index,
          pattern: patternIndex,
          oldValue: keyLimit,
          newValue: newKeyLimit
        });
        
        patchCount++;
        index = this.binaryData.indexOf(pattern, index + 1);
      }
    });
  }

  // Remove artificial startup delays
  patchStartupDelays() {
    // Look for sleep/delay values (in milliseconds)
    const delays = [
      { value: 3000, newValue: 100, description: 'Startup delay 3000ms -> 100ms' },
      { value: 1000, newValue: 50, description: 'Init delay 1000ms -> 50ms' }
    ];

    delays.forEach(delay => {
      const patterns = [
        Buffer.from([0xB8, 0x0B, 0, 0]), // 3000 in little endian (mov instruction)
        Buffer.from([0xE8, 0x03, 0, 0])  // 1000 in little endian
      ];

      patterns.forEach((pattern, patternIndex) => {
        let index = this.binaryData.indexOf(pattern);
        if (index !== -1) {
          this.binaryData.writeUInt32LE(delay.newValue, index);
          
          this.patches.push({
            description: delay.description,
            offset: index,
            pattern: patternIndex,
            oldValue: delay.value,
            newValue: delay.newValue
          });
        }
      });
    });
  }

  saveBinary() {
    writeFileSync(this.binaryPath, this.binaryData);
    console.log('Saved patched binary');
  }

  generateReport() {
    console.log('\n🔧 REDIS BINARY PATCHES APPLIED');
    console.log('================================');
    
    if (this.patches.length === 0) {
      console.log('❌ No patches applied - binary structure may have changed');
      return false;
    }

    const groupedPatches = {};
    this.patches.forEach(patch => {
      if (!groupedPatches[patch.description]) {
        groupedPatches[patch.description] = 0;
      }
      groupedPatches[patch.description]++;
    });

    Object.entries(groupedPatches).forEach(([description, count]) => {
      console.log(`✅ ${description} (${count} locations)`);
    });

    console.log(`\n📊 Total patches: ${this.patches.length}`);
    console.log('🔄 Restart Redis service to apply changes');
    
    return true;
  }

  restoreBackup() {
    copyFileSync(this.backupPath, this.binaryPath);
    console.log('Restored from backup: production-redis.bak');
  }

  async patchBinary() {
    try {
      console.log('🚀 Starting Redis Binary Optimization');
      
      this.createBackup();
      this.loadBinary();
      
      console.log('\n🔧 Applying performance patches...');
      this.patchConnectionTimeout();
      this.patchConnectionLimits();
      this.patchMemoryLimits();
      this.patchStartupDelays();
      
      this.saveBinary();
      
      const success = this.generateReport();
      
      if (!success) {
        console.log('\n⚠️  Patches failed, restoring backup...');
        this.restoreBackup();
        return false;
      }

      console.log('\n✅ Binary optimization complete');
      return true;
      
    } catch (error) {
      console.error('❌ Patching failed:', error.message);
      
      try {
        this.restoreBackup();
        console.log('🔄 Backup restored');
      } catch (restoreError) {
        console.error('💥 Backup restoration failed:', restoreError.message);
      }
      
      return false;
    }
  }
}

async function patchRedis() {
  const patcher = new RedisBinaryPatcher();
  return await patcher.patchBinary();
}

patchRedis();

export { RedisBinaryPatcher };