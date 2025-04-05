const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');

// JWTシークレットキーの設定
const JWT_SECRET = process.env.JWT_SECRET || 'lPdsdoXSRQnS4HZR4gAy4M1rDM0Q0l0G';

// HTTPサーバーの作成
const httpServer = http.createServer();

// Socket.ioサーバーの作成
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ユーザー情報の管理
const users = [];

// JWT検証関数
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

// 接続イベント
io.on('connection', async (socket) => {
  console.log('New client connected:', socket.id);

  const authToken = socket.handshake.auth.token;
  if (!authToken) {
    console.log('No auth token provided, disconnecting client');
    socket.disconnect();
    return;
  }

  // トークンを検証
  const payload = verifyToken(authToken);
  if (!payload) {
    console.log('Invalid token, disconnecting client');
    socket.disconnect();
    return;
  }

  const userId = payload.sub;
  const userName = payload.name;

  console.log(`User authenticated: ${userName} (${userId})`);

  // ユーザーをオンラインに設定
  const existingUserIndex = users.findIndex((user) => user.id === userId);
  if (existingUserIndex !== -1) {
    users[existingUserIndex].socketId = socket.id;
    users[existingUserIndex].isOnline = true;
  } else {
    users.push({
      id: userId,
      name: userName,
      socketId: socket.id,
      isOnline: true,
    });
  }

  // 全ユーザーにオンラインユーザーリストを送信
  io.emit('users', users);

  // 切断イベント
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const userIndex = users.findIndex((user) => user.socketId === socket.id);
    if (userIndex !== -1) {
      users[userIndex].isOnline = false;
      io.emit('users', users);
    }
  });

  // 呼び出しイベント
  socket.on('call', (data) => {
    console.log(`Call request from ${userId} to ${data.to}`);
    const targetUser = users.find((user) => user.id === data.to);
    if (targetUser && targetUser.isOnline) {
      socket.to(targetUser.socketId).emit('incomingCall', {
        from: userId,
        fromName: userName,
        offer: data.offer,
      });
    }
  });

  // 応答イベント
  socket.on('answer', (data) => {
    console.log(`Call answered from ${userId} to ${data.to}`);
    const targetUser = users.find((user) => user.id === data.to);
    if (targetUser && targetUser.isOnline) {
      socket.to(targetUser.socketId).emit('callAnswered', {
        from: userId,
        answer: data.answer,
      });
    }
  });

  // ICE候補イベント
  socket.on('ice-candidate', (data) => {
    const targetUser = users.find((user) => user.id === data.to);
    if (targetUser && targetUser.isOnline) {
      socket.to(targetUser.socketId).emit('ice-candidate', {
        from: userId,
        candidate: data.candidate,
      });
    }
  });

  // 通話終了イベント
  socket.on('endCall', (data) => {
    console.log(`Call ended from ${userId} to ${data.to}`);
    const targetUser = users.find((user) => user.id === data.to);
    if (targetUser && targetUser.isOnline) {
      socket.to(targetUser.socketId).emit('callEnded', {
        from: userId,
      });
    }
  });

  // マイク状態変更イベント
  socket.on('toggleMic', (data) => {
    console.log(`Mic toggled from ${userId} to ${data.to}: ${data.isEnabled}`);
    const targetUser = users.find((user) => user.id === data.to);
    if (targetUser && targetUser.isOnline) {
      socket.to(targetUser.socketId).emit('micToggled', {
        from: userId,
        isEnabled: data.isEnabled,
      });
    }
  });
});

// サーバーの起動
const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server is running on port ${PORT}`);
});
