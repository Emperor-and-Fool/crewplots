const net = require('net');

function createRedisCommand(command, args) {
    let result = `*${args.length + 1}\r\n`;
    result += `$${command.length}\r\n${command}\r\n`;
    for (const arg of args) {
        result += `$${arg.length}\r\n${arg}\r\n`;
    }
    return Buffer.from(result);
}

function testPayloadSize(size, description) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let responseData = '';
        
        const timeout = setTimeout(() => {
            client.destroy();
            reject(new Error(`Timeout for ${description} (${size} bytes)`));
        }, 5000);
        
        client.connect(6379, '127.0.0.1', () => {
            // Create payload of specified size
            const payload = 'x'.repeat(size);
            const setCommand = createRedisCommand('SET', [`test_key_${size}`, payload]);
            
            console.log(`Testing ${description}: ${size} bytes`);
            client.write(setCommand);
        });
        
        client.on('data', (data) => {
            responseData += data.toString();
            if (responseData.includes('+OK\r\n')) {
                clearTimeout(timeout);
                
                // Now test GET to verify retrieval
                const getCommand = createRedisCommand('GET', [`test_key_${size}`]);
                client.write(getCommand);
            } else if (responseData.includes(`$${size}\r\n`)) {
                clearTimeout(timeout);
                client.destroy();
                resolve(`✅ ${description}: SET/GET successful`);
            }
        });
        
        client.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
        
        client.on('close', () => {
            if (!timeout._destroyed) {
                clearTimeout(timeout);
                reject(new Error(`Connection closed unexpectedly for ${description}`));
            }
        });
    });
}

async function runPayloadTests() {
    console.log('Testing Redis server with various payload sizes...\n');
    
    const testCases = [
        { size: 100, description: 'Small payload' },
        { size: 525, description: 'Current limit' },
        { size: 865, description: 'Target requirement' },
        { size: 1024, description: '1KB payload' },
        { size: 2048, description: '2KB payload' },
        { size: 3000, description: 'Large payload' },
        { size: 4000, description: 'Maximum payload' }
    ];
    
    for (const testCase of testCases) {
        try {
            const result = await testPayloadSize(testCase.size, testCase.description);
            console.log(result);
        } catch (error) {
            console.log(`❌ ${testCase.description}: ${error.message}`);
        }
    }
    
    console.log('\nPayload testing complete.');
}

runPayloadTests();