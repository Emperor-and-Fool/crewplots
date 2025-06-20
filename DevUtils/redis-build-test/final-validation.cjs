const net = require('net');

function testRedisServer() {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        const results = [];
        
        const testCases = [
            { size: 865, description: 'Target requirement' },
            { size: 1500, description: 'Extended capacity' },
            { size: 2500, description: 'Large payload' },
            { size: 4000, description: 'Maximum capacity' }
        ];
        
        let currentTest = 0;
        
        function runNextTest() {
            if (currentTest >= testCases.length) {
                console.log('\n=== REDIS SERVER VALIDATION COMPLETE ===');
                results.forEach(result => console.log(result));
                console.log('\nServer successfully handles all required payload sizes');
                client.destroy();
                resolve(results);
                return;
            }
            
            const testCase = testCases[currentTest];
            const payload = 'X'.repeat(testCase.size);
            const key = `test_${testCase.size}`;
            
            // Create RESP command
            const setCmd = `*3\r\n$3\r\nSET\r\n$${key.length}\r\n${key}\r\n$${testCase.size}\r\n${payload}\r\n`;
            
            console.log(`Testing ${testCase.description}: ${testCase.size} bytes`);
            client.write(Buffer.from(setCmd));
        }
        
        client.connect(6379, '127.0.0.1', () => {
            console.log('Connected to Redis server');
            runNextTest();
        });
        
        client.on('data', (data) => {
            const response = data.toString();
            if (response.includes('+OK')) {
                const testCase = testCases[currentTest];
                const result = `✅ ${testCase.size} bytes: ${testCase.description} - SUCCESS`;
                results.push(result);
                console.log(result);
                currentTest++;
                
                setTimeout(() => runNextTest(), 100);
            }
        });
        
        client.on('error', (err) => {
            reject(new Error(`Connection failed: ${err.message}`));
        });
        
        client.on('close', () => {
            if (currentTest < testCases.length) {
                reject(new Error('Connection closed unexpectedly'));
            }
        });
    });
}

// Run the test
testRedisServer()
    .then(() => {
        console.log('\n✅ Production Redis server validation successful');
        process.exit(0);
    })
    .catch((error) => {
        console.log(`❌ Validation failed: ${error.message}`);
        process.exit(1);
    });