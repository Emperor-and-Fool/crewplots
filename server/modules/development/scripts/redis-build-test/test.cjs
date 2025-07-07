const net = require('net');
const client = net.createConnection(6380, '127.0.0.1');
client.on('connect', () => {
  console.log('✅ Connected to DevUtils Redis on port 6380');
  
  // Set session with expire
  client.write('*3\r\n$3\r\nSET\r\n$12\r\nsess:session1\r\n$15\r\n{"user":"test"}\r\n');
  client.write('*3\r\n$6\r\nEXPIRE\r\n$12\r\nsess:session1\r\n$4\r\n3600\r\n');
  client.write('*2\r\n$3\r\nTTL\r\n$12\r\nsess:session1\r\n');
  
  setTimeout(() => {
    console.log('✅ Session EXPIRE test completed');
    client.end();
    process.exit(0);
  }, 1000);
});

client.on('data', (data) => {
  console.log('Redis response:', data.toString().trim());
});

client.on('error', (err) => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
