const express = require("express");
const cors = require("cors");
const http = require("http");
const socketio = require("socket.io");
const startChainSync = require("./live-sync");

const app = express();
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
