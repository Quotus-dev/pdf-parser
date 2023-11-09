import { WebSocketServer } from "ws";
import { extractDataAndUploadToDB } from "../controllers/pdf.controller.js";
// import { extractDataAndUploadToDB } from '../controllers/pdf.controller';
// import { PORT } from '../index.js';

const setupWebSocketServer = (server) => {
  console.log(`🚀 Web Socket Server running ${server}`);
  const wss = new WebSocketServer({ port: server });
  let hasProcessedValidMessage = false; 
  wss.on("connection", (ws) => {
    console.log("Client connected");
    ws.on("message", async (message) => {
      if (hasProcessedValidMessage) {
        ws.send(JSON.stringify({error:true,message:'Extraction is progress.'}));
        return;
      }

      try {
        var pdfPages = JSON.parse(`${message}`);
      } catch (error) {
        const response = {
          error: true,
          data: "",
          message:
            error?.message || "Some error occurred, please try again later",
        };
        ws.send(JSON.stringify(response));
        ws.close();
      }

      if (Array.isArray(pdfPages)) {
        if (!hasProcessedValidMessage) {
          const response = await extractDataAndUploadToDB(pdfPages, ws);
          hasProcessedValidMessage = true
        }
      } else {
        const response = {
          error: true,
          data: "",
          message: "request is not a valid array",
        };
        ws.send(JSON.stringify(response));
        ws.close();
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
};

export default setupWebSocketServer;
