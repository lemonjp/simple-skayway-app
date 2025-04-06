'use client';

import { useState, useEffect, useRef } from 'react';
import { SkyWayService } from '@/lib/skyway';
import { socketService } from '@/lib/socket';

interface VoiceChatProps {
  userId: string;
  userName: string;
  token: string;
}

export default function VoiceChat({ userId, userName, token }: VoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [currentCall, setCurrentCall] = useState<{ userId: string; userName: string } | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallFrom, setIncomingCallFrom] = useState<{ userId: string; userName: string } | null>(null);
  const skywayRef = useRef<SkyWayService | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 初期化
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('Initializing services...');

        // SkyWayサービスの初期化
        const skyway = new SkyWayService();
        const skywayInitialized = await skyway.initialize(userId);
        console.log('SkyWay initialized:', skywayInitialized);
        skywayRef.current = skyway;

        // Socket.ioの初期化
        socketService.initialize(token, skyway);
        console.log('Socket.io initialized');

        // オンラインユーザーリストの購読
        const unsubscribe = socketService.onUserList((users) => {
          console.log('Received online users:', users);
          setOnlineUsers(users);
        });

        // 着信イベントのリスナー
        const unsubscribeCall = socketService.onIncomingCall((call) => {
          setIsIncomingCall(true);
          setIncomingCallFrom({
            userId: call.from,
            userName: call.fromName,
          });
        });

        // 通話応答イベントのリスナー
        const unsubscribeAnswer = socketService.onCallAnswered(async () => {
          if (skywayRef.current) {
            await skywayRef.current.publishAudio(userId);
            setIsAudioEnabled(true);

            // 音声ストリームを設定
            const remoteStream = skywayRef.current.getRemoteAudioStream();
            if (remoteStream && audioRef.current) {
              audioRef.current.srcObject = remoteStream;
              audioRef.current.play().catch(console.error);
            }
          }
        });

        // 通話終了イベントのリスナー
        const unsubscribeEnd = socketService.onCallEnded(() => {
          handleEndCall();
        });

        // マイク状態変更イベントのリスナー
        const unsubscribeMic = socketService.onMicToggled((data) => {
          console.log('Remote mic toggled:', data.isEnabled);
        });

        setIsConnected(true);

        return () => {
          unsubscribe();
          unsubscribeCall();
          unsubscribeAnswer();
          unsubscribeEnd();
          unsubscribeMic();
          socketService.disconnect();
          if (skywayRef.current) {
            skywayRef.current.dispose();
          }
        };
      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();
  }, [userId, token]);

  // 通話を開始
  const handleCall = async (targetUserId: string, targetUserName: string) => {
    if (!skywayRef.current) return;

    try {
      // ルームに参加
      const roomId = [userId, targetUserId].sort().join('-');
      await skywayRef.current.joinRoom(roomId, userId);

      // 音声ストリームを公開
      await skywayRef.current.publishAudio(userId);
      setIsAudioEnabled(true);

      // 通話状態を更新
      setCurrentCall({ userId: targetUserId, userName: targetUserName });

      // 相手に通話リクエストを送信
      socketService.callUser(targetUserId);
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  // 着信に応答
  const handleAnswerCall = async () => {
    if (!skywayRef.current || !incomingCallFrom) return;

    try {
      // ルームに参加
      const roomId = [userId, incomingCallFrom.userId].sort().join('-');
      await skywayRef.current.joinRoom(roomId, userId);

      // 音声ストリームを公開
      await skywayRef.current.publishAudio(userId);
      setIsAudioEnabled(true);

      // 通話状態を更新
      setCurrentCall(incomingCallFrom);
      setIsIncomingCall(false);
      setIncomingCallFrom(null);

      // 相手に応答を送信
      socketService.answerCall(incomingCallFrom.userId);

      // 音声ストリームを設定
      const remoteStream = skywayRef.current.getRemoteAudioStream();
      if (remoteStream && audioRef.current) {
        audioRef.current.srcObject = remoteStream;
        audioRef.current.play().catch(console.error);
      }
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  // 着信を拒否
  const handleRejectCall = () => {
    if (!incomingCallFrom) return;

    socketService.endCall(incomingCallFrom.userId);
    setIsIncomingCall(false);
    setIncomingCallFrom(null);
  };

  // 通話を終了
  const handleEndCall = async () => {
    if (!skywayRef.current || !currentCall) return;

    try {
      // ルームから退出
      await skywayRef.current.leaveRoom(userId);

      // 相手に通話終了を通知
      socketService.endCall(currentCall.userId);

      // 通話状態をリセット
      setCurrentCall(null);
      setIsAudioEnabled(false);

      // 音声ストリームをクリア
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  // マイクのON/OFF切り替え
  const handleToggleMic = () => {
    if (!skywayRef.current || !currentCall) return;

    const isEnabled = skywayRef.current.toggleAudio();
    setIsAudioEnabled(isEnabled);

    // 相手にマイク状態の変更を通知
    socketService.notifyMicToggle(currentCall.userId, isEnabled);
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">ステータス</h2>
        <p>
          接続状態: <span className={isConnected ? "text-green-600" : "text-red-600"}>
            {isConnected ? "接続済み" : "未接続"}
          </span>
        </p>
        {currentCall && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-lg font-medium mb-2">通話中: {currentCall.userName}</p>
            <div className="flex items-center justify-between">
              <button
                onClick={handleToggleMic}
                className={`px-4 py-2 rounded-md ${
                  isAudioEnabled ? "bg-green-500 text-white" : "bg-red-500 text-white"
                }`}
              >
                {isAudioEnabled ? "マイクON" : "マイクOFF"}
              </button>
              <button
                onClick={handleEndCall}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
              >
                通話終了
              </button>
            </div>
          </div>
        )}
      </div>

      {isIncomingCall && incomingCallFrom && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-lg font-medium mb-2">{incomingCallFrom.userName}からの着信</p>
          <div className="flex space-x-2">
            <button
              onClick={handleAnswerCall}
              className="px-4 py-2 bg-green-600 text-white rounded-md"
            >
              応答
            </button>
            <button
              onClick={handleRejectCall}
              className="px-4 py-2 bg-red-600 text-white rounded-md"
            >
              拒否
            </button>
          </div>
        </div>
      )}

      {!currentCall && !isIncomingCall && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">オンラインユーザー</h2>
          {onlineUsers.length === 0 ? (
            <p className="text-gray-500">オンラインユーザーはいません</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {onlineUsers.map((user) => (
                <li key={user.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span>{user.name}</span>
                  </div>
                  <button
                    onClick={() => handleCall(user.id, user.name)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md"
                  >
                    通話
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 音声再生用の非表示の audio 要素 */}
      <audio ref={audioRef} autoPlay playsInline className="hidden"></audio>
    </div>
  );
}
