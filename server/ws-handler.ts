import { Server } from 'http';
import WebSocket from 'ws';
import { log } from './vite';

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws: WebSocket) => {
    log('WebSocket client connected', 'ws');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        log(`Received: ${JSON.stringify(data)}`, 'ws');
        
        // Handle message types here
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        log(`Error parsing message: ${message}`, 'ws');
      }
    });
    
    ws.on('close', () => {
      log('WebSocket client disconnected', 'ws');
    });
    
    ws.on('error', (error: Error) => {
      log(`WebSocket error: ${error.message}`, 'ws');
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connected' }));
  });
  
  // Handle server errors
  wss.on('error', (error: Error) => {
    log(`WebSocket server error: ${error.message}`, 'ws');
  });
  
  return wss;
}