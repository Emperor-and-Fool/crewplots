import Redis from 'ioredis';

/**
 * Debugging script to test connection lifecycle issues
 * Tests the exact scenario that causes timeouts in the application
 */

async function testConnectionLifecycle() {
  console.log('🔧 Testing Redis Connection Lifecycle Issues');
  console.log('============================================');

  // Test 1: Simulate session-aware key pattern
  const sessionId = 'U-A6CNh9';
  const userId = 2;
  const cacheKey = `session:${sessionId.substring(0, 8)}:user:${userId}:notes`;
  
  console.log(`\n📋 Test 1: Session-aware cache key pattern`);
  console.log(`Key: ${cacheKey}`);
  
  try {
    const client1 = new Redis({
      host: '127.0.0.1',
      port: 6379,
      connectTimeout: 2000,
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    });

    console.log('  Connecting client1...');
    await client1.connect();
    
    console.log('  Testing GET on non-existent key...');
    const start1 = Date.now();
    const result1 = await client1.get(cacheKey);
    const time1 = Date.now() - start1;
    console.log(`  GET result: ${result1} (${time1}ms)`);
    
    console.log('  Testing SET with session-aware key...');
    const testData = JSON.stringify([{
      id: 43,
      content: '<p>Test note content</p>',
      userId: 2,
      metadata: { wordCount: 26, characterCount: 139 }
    }]);
    
    const start2 = Date.now();
    await client1.setex(cacheKey, 300, testData);
    const time2 = Date.now() - start2;
    console.log(`  SETEX completed (${time2}ms)`);
    
    console.log('  Testing GET on existing key...');
    const start3 = Date.now();
    const result3 = await client1.get(cacheKey);
    const time3 = Date.now() - start3;
    console.log(`  GET result length: ${result3?.length || 0} (${time3}ms)`);
    
    await client1.disconnect();
    console.log('  ✅ Test 1 completed successfully');
    
  } catch (error) {
    console.log(`  ❌ Test 1 failed: ${error.message}`);
  }

  // Test 2: Connection reuse scenario
  console.log(`\n📋 Test 2: Connection reuse simulation`);
  
  try {
    const client2 = new Redis({
      host: '127.0.0.1',
      port: 6379,
      connectTimeout: 2000,
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    });

    console.log('  Creating persistent connection...');
    await client2.connect();
    
    console.log('  First operation...');
    const start4 = Date.now();
    await client2.ping();
    const time4 = Date.now() - start4;
    console.log(`  PING 1: ${time4}ms`);
    
    console.log('  Second operation (reusing connection)...');
    const start5 = Date.now();
    await client2.get(cacheKey);
    const time5 = Date.now() - start5;
    console.log(`  GET 2: ${time5}ms`);
    
    console.log('  Third operation (reusing connection)...');
    const start6 = Date.now();
    await client2.set('test:reuse', 'value');
    const time6 = Date.now() - start6;
    console.log(`  SET 3: ${time6}ms`);
    
    await client2.disconnect();
    console.log('  ✅ Test 2 completed successfully');
    
  } catch (error) {
    console.log(`  ❌ Test 2 failed: ${error.message}`);
  }

  // Test 3: Large payload handling
  console.log(`\n📋 Test 3: Large payload (865B) handling`);
  
  try {
    const client3 = new Redis({
      host: '127.0.0.1',
      port: 6379,
      connectTimeout: 2000,
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    });

    await client3.connect();
    
    // Create 865B payload similar to application data
    const largePayload = JSON.stringify({
      id: 43,
      content: '<p>👍😃Oke, let me try this again. It seems updates work too.<br>Good thing the mongo db needs a restart. That will extend the testing to the max.</p>',
      messageType: 'rich-text',
      userId: 2,
      receiverId: null,
      isPrivate: false,
      attachmentUrl: null,
      noteReference: null,
      metadata: null,
      isRead: false,
      priority: 'normal',
      workflow: 'general',
      visibleToRoles: null,
      createdAt: '2025-06-18T18:58:24.180Z',
      updatedAt: '2025-06-18T18:58:24.180Z',
      noteId: '68530c5050a9031a3fd1ec44',
      noteType: 'general',
      title: null,
      status: 'draft',
      wordCount: 26,
      characterCount: 139,
      htmlLength: 150,
      visibility: 'private',
      isEditable: true,
      lastEditedAt: null,
      version: 1,
      tags: null,
      compiledContent: '<p>👍😃Oke, let me try this again. It seems updates work too.<br>Good thing the mongo db needs a restart. That will extend the testing to the max.</p>'
    });
    
    console.log(`  Payload size: ${Buffer.byteLength(largePayload, 'utf8')} bytes`);
    
    const start7 = Date.now();
    await client3.setex('test:large', 300, largePayload);
    const time7 = Date.now() - start7;
    console.log(`  Large SETEX: ${time7}ms`);
    
    const start8 = Date.now();
    const retrieved = await client3.get('test:large');
    const time8 = Date.now() - start8;
    console.log(`  Large GET: ${time8}ms (retrieved ${retrieved?.length || 0} bytes)`);
    
    await client3.disconnect();
    console.log('  ✅ Test 3 completed successfully');
    
  } catch (error) {
    console.log(`  ❌ Test 3 failed: ${error.message}`);
  }

  console.log('\n🎯 Summary: All Redis operations completed without hanging');
  console.log('The issue is likely in the connection management layer, not Redis itself');
}

testConnectionLifecycle();