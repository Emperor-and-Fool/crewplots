const net = require('net');

function testRedisConnection() {
    console.log('Testing Redis connection to 127.0.0.1:6379...');
    
    const client = new net.Socket();
    
    client.setTimeout(5000);
    
    client.on('connect', () => {
        console.log('✅ Connected to Redis server');
        // Send PING command in RESP format
        client.write('*1\r\n$4\r\nPING\r\n');
    });
    
    client.on('data', (data) => {
        console.log('✅ Redis response:', data.toString().trim());
        client.destroy();
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

testRedisConnection();