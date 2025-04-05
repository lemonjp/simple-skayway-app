import { io, Socket } from 'socket.io-client';
import { SkyWayService } from './skyway';

class SocketService {
  private socket: Socket | null = null;
  private skyway: SkyWayService | null = null;
  private onlineUsers: any[] = [];
  private userListeners: ((users: any[]) => void)[] = [];
  private callListeners: ((call: any) => void)[] = [];
  private callAnsweredListeners: ((answer: any) => void)[] = [];
  private callEndedListeners: ((data: any) => void)[] = [];
  private micToggledListeners: ((data: any) => void)[] = [];

  // Socket.ioクライアントを初期化する
  initialize(token: string, skyway: SkyWayService) {
    if (this.socket && this.socket.connected) {
      return;
    }

    this.skyway = skyway;

    // Socket.ioクライアントを作成
    this.socket = io('http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // 接続イベント
    this.socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    // 切断イベント
    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    // オンラインユーザーリストを受信
    this.socket.on('users', (users) => {
      this.onlineUsers = users;
      this.userListeners.forEach(listener => listener(users));
    });

    // 着信イベント
    this.socket.on('incomingCall', (call) => {
      this.callListeners.forEach(listener => listener(call));
    });

    // 通話応答イベント
    this.socket.on('callAnswered', (answer) => {
      this.callAnsweredListeners.forEach(listener => listener(answer));
    });

    // 通話終了イベント
    this.socket.on('callEnded', (data) => {
      this.callEndedListeners.forEach(listener => listener(data));
    });

    // マイク状態変更イベント
    this.socket.on('micToggled', (data) => {
      this.micToggledListeners.forEach(listener => listener(data));
    });
  }

  // ソケット接続の取得
  getSocket() {
    return this.socket;
  }

  // オンラインユーザーリストの取得
  getOnlineUsers() {
    return this.onlineUsers;
  }

  // ユーザーリスト変更のリスナー追加
  onUserList(callback: (users: any[]) => void) {
    this.userListeners.push(callback);
    return () => {
      this.userListeners = this.userListeners.filter(cb => cb !== callback);
    };
  }

  // 着信イベントのリスナー追加
  onIncomingCall(callback: (call: any) => void) {
    this.callListeners.push(callback);
    return () => {
      this.callListeners = this.callListeners.filter(cb => cb !== callback);
    };
  }

  // 通話応答イベントのリスナー追加
  onCallAnswered(callback: (answer: any) => void) {
    this.callAnsweredListeners.push(callback);
    return () => {
      this.callAnsweredListeners = this.callAnsweredListeners.filter(cb => cb !== callback);
    };
  }

  // 通話終了イベントのリスナー追加
  onCallEnded(callback: (data: any) => void) {
    this.callEndedListeners.push(callback);
    return () => {
      this.callEndedListeners = this.callEndedListeners.filter(cb => cb !== callback);
    };
  }

  // マイク状態変更イベントのリスナー追加
  onMicToggled(callback: (data: any) => void) {
    this.micToggledListeners.push(callback);
    return () => {
      this.micToggledListeners = this.micToggledListeners.filter(cb => cb !== callback);
    };
  }

  // 通話開始
  callUser(userId: string) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('call', { to: userId });
  }

  // 通話応答
  answerCall(userId: string) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('answer', { to: userId });
  }

  // 通話終了
  endCall(userId: string) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('endCall', { to: userId });
  }

  // マイク状態変更通知
  notifyMicToggle(userId: string, isEnabled: boolean) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('toggleMic', { to: userId, isEnabled });
  }

  // 切断
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.userListeners = [];
    this.callListeners = [];
    this.callAnsweredListeners = [];
    this.callEndedListeners = [];
    this.micToggledListeners = [];
  }
}

// シングルトンインスタンスをエクスポート
export const socketService = new SocketService();
