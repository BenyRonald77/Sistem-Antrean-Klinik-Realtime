import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { setIO } from "../src/lib/realtime";

const port = Number(process.env.PORT) || 3000;
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      // no-op: dicadangkan untuk logging/metrics di masa depan
    });
  });

  setIO(io);

  httpServer.listen(port, () => {
    console.log(`> Server siap di http://localhost:${port}`);
    console.log(`> Socket.IO aktif di path /socket.io`);
  });
});
