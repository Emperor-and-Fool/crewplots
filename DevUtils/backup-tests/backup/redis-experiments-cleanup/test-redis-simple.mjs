import Redis from "ioredis";

const client = new Redis({
  port: 6379,
  host: "127.0.0.1",
  enableAutoPipelining: true,
});

client.on("connect", () => console.log("Connected"));
client.on("ready", () => console.log("Ready"));
client.on("error", (err) => console.error("Error:", err));

// Start Redis server first
import { spawn } from 'child_process';

const redisProcess = spawn('./production-redis', [], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false
});

redisProcess.stdout.on('data', (data) => {
  console.log(`Redis: ${data.toString().trim()}`);
});

// Wait for server to start
await new Promise(resolve => setTimeout(resolve, 2000));

try {
  await client.set("foo", "bar");
  console.log(await client.get("foo")); // should log "bar"
  
  console.log("✅ Test completed successfully!");
} catch (error) {
  console.error("❌ Test failed:", error);
} finally {
  await client.disconnect();
  redisProcess.kill('SIGTERM');
}