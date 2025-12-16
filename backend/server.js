const express = require("express");
const cors = require("cors");
const http = require("http");
const socketio = require("socket.io");
const startChainSync = require("./live-sync");
const { nonceRouter } = require("./noncegenerate");
const { verifyRouter } = require("./verifySignature");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Mount authentication routes
app.use(nonceRouter);
app.use(verifyRouter);

const PORT = 5000;
const server = http.createServer(app);

const io = socketio(server, {
  cors: {
    origin: "*",
  },
});

app.get("/", (req, res) => {
  res.send("Cardano Live Explorer Server is running.");
});

startChainSync((block) => {
  const safeBlock = JSON.parse(
    JSON.stringify(block, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  io.emit("block", safeBlock);
  io.emit("blocks", safeBlock);
  io.emit("newBlock", safeBlock);
  // Quick visibility in server logs
  console.log("➡️  Emitted block to clients");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
