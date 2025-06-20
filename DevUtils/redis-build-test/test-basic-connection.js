import net from 'net';

function testBasicConnection() {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let responseData = '';
        
        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error('Connection timeout'));
        }, 5000);
        
        client.connect(6379, '127.0.0.1', () => {
            console.log('✅ Connected to Redis server');
            
            // Send PING command
            const pingCommand = '*1\r\n$4\r\nPING\r\n';
            client.write(pingCommand);
        });
        
        client.on('data', (data) => {
            responseData += data.toString();
            console.log('Received:', JSON.stringify(data.toString()));
            
            if (responseData.includes('+PONG\r\n')) {
                clearTimeout(timeout);
                client.destroy();
                resolve('PING successful');
            }
        });
        
        client.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
        
        client.on('close', () => {
            console.log('Connection closed');
        });
    });
}

async function runTest() {
    try {
        console.log('Testing basic Redis connection...');
        const result = await testBasicConnection();
        console.log('✅', result);
    } catch (error) {
        console.log('❌', error.message);
    }
}

runTest();