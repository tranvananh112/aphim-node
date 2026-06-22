const { Server } = require('socket.io');

let io;

module.exports = {
  init: (httpServer, corsOptions) => {
    console.log('--- Initializing Socket.io ---');
    
    io = new Server(httpServer, {
      cors: corsOptions,
      path: '/socket.io/',
      transports: ['polling', 'websocket']
    });
    
    io.on('connection', (socket) => {
      console.log('🟢 Client Connected to Socket:', socket.id);
      
      socket.on('disconnect', (reason) => {
        console.log('🔴 Client disconnected:', socket.id, 'Reason:', reason);
      });
    });
    
    return io;
  },
  isInitialized: () => {
    return !!io;
  },
  getIO: () => {
    if (!io) {
      console.warn('⚠️ Attempted to get IO before initialization');
      return null;
    }
    return io;
  },
  emitEvent: (event, data) => {
    if (io) {
      io.emit(event, data);
    } else {
        console.warn(`⚠️ Cannot emit ${event}, io not initialized`);
    }
  }
};
