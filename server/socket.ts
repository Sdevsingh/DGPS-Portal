import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // Join a job's chat room
  socket.on("join:job", (jobId: string) => {
    socket.join(`job:${jobId}`);
    console.log(`[socket] ${socket.id} joined job:${jobId}`);
  });

  socket.on("leave:job", (jobId: string) => {
    socket.leave(`job:${jobId}`);
  });

  // New message — broadcast to everyone in the job room
  socket.on("message:send", (data: { jobId: string; message: object }) => {
    io.to(`job:${data.jobId}`).emit("message:new", data.message);
  });

  // Job status updated
  socket.on("job:update", (data: { jobId: string; update: object }) => {
    io.to(`job:${data.jobId}`).emit("job:updated", data.update);
  });

  // Chat pending_on changed
  socket.on("chat:pending", (data: { jobId: string; pendingOn: string }) => {
    io.to(`job:${data.jobId}`).emit("chat:pending_changed", data);
  });

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[socket] Socket.io server running on port ${PORT}`);
});

export { io };
