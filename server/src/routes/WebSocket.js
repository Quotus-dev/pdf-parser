import { WebSocketServer } from 'ws';
import { extractDataAndUploadToDB } from '../controllers/pdf.controller';
// import { PORT } from '../index.js';

const setupWebSocketServer = (server) => {
  console.log(`🚀 Web Socket Server running ${server}`);
  const wss = new WebSocketServer({ port: server });

  wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
      console.log(`Received: ${message}`);
      extractDataAndUploadToDB

    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
};

export default setupWebSocketServer;