import { Server } from "socket.io";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

let io: Server;

interface User {
  id: string;
  name: string;
  socketId: string;
  isOnline: boolean;
}

const users: User[] = [];

export async function GET(req: NextRequest) {
  if (io) {
    return NextResponse.json({ message: "Socket server is already running" });
  }

  try {
    // 新しいSocket.ioサーバーを作成
    io = new Server({
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // 接続イベント
    io.on("connection", async (socket) => {
      const authToken = socket.handshake.auth.token;
      if (!authToken) {
        socket.disconnect();
        return;
      }

      // トークンを検証
      const payload = await verifyToken(authToken);
      if (!payload) {
        socket.disconnect();
        return;
      }

      const userId = payload.sub as string;
      const userName = payload.name as string;

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
      io.emit("users", users);

      // 切断イベント
      socket.on("disconnect", () => {
        const userIndex = users.findIndex((user) => user.socketId === socket.id);
        if (userIndex !== -1) {
          users[userIndex].isOnline = false;
          io.emit("users", users);
        }
      });

      // 呼び出しイベント
      socket.on("call", (data: { to: string; offer: any }) => {
        const targetUser = users.find((user) => user.id === data.to);
        if (targetUser && targetUser.isOnline) {
          socket.to(targetUser.socketId).emit("incomingCall", {
            from: userId,
            fromName: userName,
            offer: data.offer,
          });
        }
      });

      // 応答イベント
      socket.on("answer", (data: { to: string; answer: any }) => {
        const targetUser = users.find((user) => user.id === data.to);
        if (targetUser && targetUser.isOnline) {
          socket.to(targetUser.socketId).emit("callAnswered", {
            from: userId,
            answer: data.answer,
          });
        }
      });

      // ICE候補イベント
      socket.on("ice-candidate", (data: { to: string; candidate: any }) => {
        const targetUser = users.find((user) => user.id === data.to);
        if (targetUser && targetUser.isOnline) {
          socket.to(targetUser.socketId).emit("ice-candidate", {
            from: userId,
            candidate: data.candidate,
          });
        }
      });

      // 通話終了イベント
      socket.on("endCall", (data: { to: string }) => {
        const targetUser = users.find((user) => user.id === data.to);
        if (targetUser && targetUser.isOnline) {
          socket.to(targetUser.socketId).emit("callEnded", {
            from: userId,
          });
        }
      });

      // マイク状態変更イベント
      socket.on("toggleMic", (data: { to: string; isEnabled: boolean }) => {
        const targetUser = users.find((user) => user.id === data.to);
        if (targetUser && targetUser.isOnline) {
          socket.to(targetUser.socketId).emit("micToggled", {
            from: userId,
            isEnabled: data.isEnabled,
          });
        }
      });
    });

    // Socket.ioサーバーを起動
    io.listen(3001);

    return NextResponse.json({ message: "Socket server started successfully" });
  } catch (error) {
    console.error("Socket server error:", error);
    return NextResponse.json(
      { error: "Failed to start socket server" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({ message: "Method not allowed" }, { status: 405 });
}
