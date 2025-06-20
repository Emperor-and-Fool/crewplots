import net from 'net';

function testLargePayload() {
    console.log('Testing Redis with 865-byte payload...');
    
    // Create the 865-byte payload that was failing
    const largeValue = JSON.stringify([{
        "id": 43,
        "content": "<p>👍😃Oke, let me try this again. It seems updates work too.<br>Good thing the mongo db needs a restart. That will extend the testing to the max.</p>",
        "messageType": "rich-text",
        "userId": 2,
        "receiverId": null,
        "isPrivate": false,
        "attachmentUrl": null,
        "noteReference": null,
        "metadata": null,
        "isRead": false,
        "priority": "normal",
        "workflow": "general",
        "visibleToRoles": null,
        "createdAt": "2025-06-18T18:58:24.180Z",
        "updatedAt": "2025-06-18T18:58:24.180Z",
        "noteId": "68530c5050a9031a3fd1ec44",
        "noteType": "general",
        "title": null,
        "status": "draft",
        "wordCount": 26,
        "characterCount": 139,
        "htmlLength": 150,
        "visibility": "private",
        "isEditable": true,
        "lastEditedAt": null,
        "version": 1,
        "tags": null,
        "compiledContent": "<p>👍😃Oke, let me try this again. It seems updates work too.<br>Good thing the mongo db needs a restart. That will extend the testing to the max.</p>"
    }]);
    
    console.log(`Payload size: ${largeValue.length} bytes`);
    
    const client = new net.Socket();
    client.setTimeout(5000);
    
    client.on('connect', () => {
        console.log('✅ Connected to Redis server');
        
        // Test SET command with large payload
        const key = 'test:large:payload';
        const setCommand = `*3\r\n$3\r\nSET\r\n$${key.length}\r\n${key}\r\n$${largeValue.length}\r\n${largeValue}\r\n`;
        
        console.log(`Sending SET command with ${setCommand.length} byte frame...`);
        client.write(setCommand);
    });
    
    let responseCount = 0;
    client.on('data', (data) => {
        responseCount++;
        const response = data.toString().trim();
        console.log(`✅ Redis response ${responseCount}:`, response);
        
        if (responseCount === 1) {
            // After SET, try GET
            const getCommand = `*2\r\n$3\r\nGET\r\n$${key.length}\r\n${key}\r\n`;
            console.log('Sending GET command...');
            client.write(getCommand);
        } else {
            client.destroy();
        }
    });
    
    client.on('error', (err) => {
        console.log('❌ Connection error:', err.message);
    });
    
    client.on('timeout', () => {
        console.log('❌ Connection timeout');
        client.destroy();
    });
    
    client.connect(6379, '127.0.0.1');
}

testLargePayload();