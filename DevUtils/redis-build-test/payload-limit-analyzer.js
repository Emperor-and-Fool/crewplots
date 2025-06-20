import Redis from 'ioredis';
import { writeFileSync } from 'fs';

/**
 * Systematic Redis Payload Limit Testing
 * Tests exact byte thresholds where Redis server fails
 */

class PayloadLimitAnalyzer {
  constructor() {
    this.results = {
      successful: [],
      failed: [],
      thresholds: {},
      analysis: {}
    };
  }

  async testPayloadSize(size, testType = 'basic') {
    const client = new Redis({
      host: '127.0.0.1',
      port: 6379,
      connectTimeout: 2000,
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1
    });

    try {
      await client.connect();
      
      // Create payload of exact size
      const payload = this.createPayload(size, testType);
      const key = `test:${testType}:${size}`;
      
      const start = Date.now();
      
      // Test SET operation with timeout
      await Promise.race([
        client.setex(key, 30, payload),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SET timeout')), 5000)
        )
      ]);
      
      // Test GET operation with timeout
      const retrieved = await Promise.race([
        client.get(key),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('GET timeout')), 5000)
        )
      ]);
      
      const duration = Date.now() - start;
      
      await client.disconnect();
      
      const success = retrieved && retrieved.length === payload.length;
      
      this.results.successful.push({
        size,
        testType,
        duration,
        payloadType: this.getPayloadType(payload),
        verified: success
      });
      
      return { success: true, duration, verified: success };
      
    } catch (error) {
      try {
        await client.disconnect();
      } catch {}
      
      this.results.failed.push({
        size,
        testType,
        error: error.message,
        payloadType: this.getPayloadType(this.createPayload(size, testType))
      });
      
      return { success: false, error: error.message };
    }
  }

  createPayload(targetSize, type) {
    switch (type) {
      case 'json':
        return this.createJsonPayload(targetSize);
      case 'note':
        return this.createNotePayload(targetSize);
      case 'text':
        return this.createTextPayload(targetSize);
      default:
        return this.createBasicPayload(targetSize);
    }
  }

  createJsonPayload(targetSize) {
    const baseObj = {
      id: 1,
      type: "test",
      timestamp: new Date().toISOString(),
      metadata: { test: true }
    };
    
    let content = "x";
    while (JSON.stringify({ ...baseObj, content }).length < targetSize) {
      content += "x";
    }
    
    const result = JSON.stringify({ ...baseObj, content });
    return result.substring(0, targetSize);
  }

  createNotePayload(targetSize) {
    const noteTemplate = {
      id: 43,
      content: "",
      messageType: "rich-text",
      userId: 2,
      receiverId: null,
      isPrivate: false,
      attachmentUrl: null,
      noteReference: null,
      metadata: { wordCount: 0, characterCount: 0 },
      isRead: false,
      priority: "normal",
      workflow: "general",
      visibleToRoles: null,
      createdAt: "2025-06-18T18:58:24.180Z",
      updatedAt: "2025-06-18T18:58:24.180Z",
      noteId: "68530c5050a9031a3fd1ec44",
      noteType: "general",
      title: null,
      status: "draft",
      wordCount: 0,
      characterCount: 0,
      htmlLength: 0,
      visibility: "private",
      isEditable: true,
      lastEditedAt: null,
      version: 1,
      tags: null,
      compiledContent: ""
    };
    
    let content = "<p>Test content ";
    while (JSON.stringify({ ...noteTemplate, content, compiledContent: content }).length < targetSize) {
      content += "x";
    }
    content += "</p>";
    
    const finalNote = {
      ...noteTemplate,
      content,
      compiledContent: content,
      characterCount: content.length,
      htmlLength: content.length
    };
    
    const result = JSON.stringify(finalNote);
    return result.substring(0, targetSize);
  }

  createTextPayload(targetSize) {
    return "x".repeat(targetSize);
  }

  createBasicPayload(targetSize) {
    const data = { value: "x".repeat(Math.max(0, targetSize - 20)) };
    const result = JSON.stringify(data);
    return result.substring(0, targetSize);
  }

  getPayloadType(payload) {
    try {
      const parsed = JSON.parse(payload);
      if (parsed.messageType) return 'note-like';
      if (typeof parsed === 'object') return 'json';
      return 'simple';
    } catch {
      return 'text';
    }
  }

  async findThresholds() {
    console.log('🔍 Finding Redis Payload Thresholds');
    console.log('====================================');
    
    // Test ranges to find exact limits
    const testRanges = [
      { start: 100, end: 500, step: 50, type: 'basic' },
      { start: 500, end: 800, step: 25, type: 'json' },
      { start: 800, end: 900, step: 5, type: 'note' },
      { start: 900, end: 1000, step: 10, type: 'note' }
    ];

    for (const range of testRanges) {
      console.log(`\n📊 Testing ${range.type} payloads: ${range.start}-${range.end} bytes`);
      
      for (let size = range.start; size <= range.end; size += range.step) {
        const result = await this.testPayloadSize(size, range.type);
        
        if (result.success) {
          console.log(`  ✅ ${size}B: ${result.duration}ms`);
        } else {
          console.log(`  ❌ ${size}B: ${result.error}`);
          
          // Found failure point, narrow down exact threshold
          if (size > range.start) {
            console.log(`  🎯 Narrowing threshold around ${size}B...`);
            await this.narrowThreshold(size - range.step, size, range.type);
          }
          break;
        }
      }
    }
  }

  async narrowThreshold(lastSuccess, firstFailure, type) {
    for (let size = lastSuccess + 1; size < firstFailure; size++) {
      const result = await this.testPayloadSize(size, type);
      
      if (!result.success) {
        this.results.thresholds[type] = {
          maxSuccess: size - 1,
          firstFailure: size,
          threshold: size
        };
        console.log(`  🎯 ${type} threshold: ${size - 1}B max, fails at ${size}B`);
        return;
      }
    }
  }

  async testSpecificSizes() {
    console.log('\n🎯 Testing Application-Specific Sizes');
    console.log('=====================================');
    
    const specificSizes = [
      { size: 863, type: 'note', description: 'Test script hang size' },
      { size: 865, type: 'note', description: 'Application note size' },
      { size: 870, type: 'note', description: 'Slightly larger note' },
      { size: 850, type: 'note', description: 'Slightly smaller note' },
      { size: 1000, type: 'json', description: 'Large payload test' }
    ];

    for (const test of specificSizes) {
      console.log(`\n📋 ${test.description} (${test.size}B)`);
      const result = await this.testPayloadSize(test.size, test.type);
      
      if (result.success) {
        console.log(`  ✅ Success: ${result.duration}ms`);
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
      }
    }
  }

  async performStressTest() {
    console.log('\n💪 Redis Stress Testing');
    console.log('=======================');
    
    // Test rapid operations at safe size
    const safeSize = 600;
    const iterations = 20;
    
    console.log(`Testing ${iterations} rapid operations at ${safeSize}B...`);
    
    const client = new Redis({
      host: '127.0.0.1',
      port: 6379,
      connectTimeout: 2000,
      lazyConnect: true,
      enableReadyCheck: false
    });

    try {
      await client.connect();
      
      const startTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < iterations; i++) {
        const payload = this.createPayload(safeSize, 'json');
        promises.push(
          client.setex(`stress:${i}`, 30, payload).then(() => 
            client.get(`stress:${i}`)
          )
        );
      }
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      console.log(`  ✅ ${iterations} operations completed in ${duration}ms`);
      console.log(`  📈 Average: ${(duration / iterations).toFixed(1)}ms per operation`);
      
      await client.disconnect();
      
    } catch (error) {
      console.log(`  ❌ Stress test failed: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 PAYLOAD ANALYSIS REPORT');
    console.log('===========================');
    
    // Calculate statistics
    const successfulSizes = this.results.successful.map(r => r.size);
    const failedSizes = this.results.failed.map(r => r.size);
    
    if (successfulSizes.length > 0) {
      const maxSuccess = Math.max(...successfulSizes);
      const avgDuration = this.results.successful.reduce((sum, r) => sum + r.duration, 0) / this.results.successful.length;
      
      console.log(`Maximum successful payload: ${maxSuccess} bytes`);
      console.log(`Average operation time: ${avgDuration.toFixed(1)}ms`);
    }
    
    if (failedSizes.length > 0) {
      const minFailure = Math.min(...failedSizes);
      console.log(`Minimum failure size: ${minFailure} bytes`);
    }
    
    // Threshold analysis
    console.log('\nThreshold Analysis:');
    Object.entries(this.results.thresholds).forEach(([type, threshold]) => {
      console.log(`  ${type}: Max ${threshold.maxSuccess}B, fails at ${threshold.firstFailure}B`);
    });
    
    // Application impact
    console.log('\nApplication Impact:');
    console.log(`  Current note size (865B): ${failedSizes.includes(865) ? 'FAILS' : 'UNKNOWN'}`);
    console.log(`  Required margin: ${this.calculateRequiredMargin()}B`);
    
    // Save detailed results
    const reportData = {
      timestamp: new Date().toISOString(),
      successful: this.results.successful,
      failed: this.results.failed,
      thresholds: this.results.thresholds,
      summary: {
        maxSuccessful: successfulSizes.length > 0 ? Math.max(...successfulSizes) : 0,
        minFailed: failedSizes.length > 0 ? Math.min(...failedSizes) : null,
        applicationNoteSize: 865,
        recommendedMaxSize: this.getRecommendedMaxSize()
      }
    };
    
    writeFileSync('./DevUtils/redis-build-test/payload-analysis-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n✅ Detailed report saved to payload-analysis-report.json');
    
    return reportData;
  }

  calculateRequiredMargin() {
    const successfulSizes = this.results.successful.map(r => r.size);
    if (successfulSizes.length === 0) return 'UNKNOWN';
    
    const maxSuccess = Math.max(...successfulSizes);
    const currentAppSize = 865;
    
    return Math.max(0, currentAppSize - maxSuccess);
  }

  getRecommendedMaxSize() {
    const successfulSizes = this.results.successful.map(r => r.size);
    if (successfulSizes.length === 0) return 0;
    
    return Math.max(...successfulSizes) - 50; // 50B safety margin
  }
}

async function runPayloadAnalysis() {
  const analyzer = new PayloadLimitAnalyzer();
  
  try {
    await analyzer.findThresholds();
    await analyzer.testSpecificSizes();
    await analyzer.performStressTest();
    
    const report = analyzer.generateReport();
    
    console.log('\n🎯 REQUIRED CHANGES ANALYSIS');
    console.log('=============================');
    
    if (report.summary.maxSuccessful < 865) {
      const deficit = 865 - report.summary.maxSuccessful;
      console.log(`❌ Current Redis server cannot handle application data`);
      console.log(`   Deficit: ${deficit} bytes below required capacity`);
      console.log(`   Changes needed:`);
      console.log(`   1. Increase Redis buffer size by ${deficit + 100}+ bytes`);
      console.log(`   2. Fix payload parsing logic for large JSON objects`);
      console.log(`   3. Implement proper connection cleanup on buffer overflow`);
    } else {
      console.log(`✅ Redis server can handle application data`);
      console.log(`   Safety margin: ${report.summary.maxSuccessful - 865} bytes`);
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

runPayloadAnalysis();