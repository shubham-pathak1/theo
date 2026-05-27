let io;

export function initSocket(socketServer) {
  io = socketServer;

  io.on("connection", (socket) => {
    socket.on("image:watch", (imageId) => {
      socket.join(`image:${imageId}`);
    });
  });
}

export function emitImageStatus(image) {
  if (!io) return;

  io.to(`image:${image.id}`).emit("image:status", {
    id: image.id,
    status: image.status,
    url: image.url,
    thumbnailUrl: image.thumbnailUrl,
    error: image.error
  });
}
