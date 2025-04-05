import { SkyWayContext, SkyWayRoom, SkyWayStreamFactory, P2PRoom, type RoomPublication, RoomMember } from '@skyway-sdk/room';
import { nowInSec, RemoteAudioStream, SkyWayAuthToken, uuidV4 } from '@skyway-sdk/core';

const appId = process.env.NEXT_PUBLIC_SKYWAY_APP_ID || '';
const secret = process.env.NEXT_PUBLIC_SKYWAY_SECRET_KEY || '';

// トークンの作成
const token = new SkyWayAuthToken({
  jti: uuidV4(),
  iat: nowInSec(),
  exp: nowInSec() + 60 * 60 * 24, // トークンの有効期限を設定
  scope: {
    app: {
      id: appId,
      turn: true,
      actions: ['read'],
      channels: [
        {
          id: '*',
          name: '*',
          actions: ['write'],
          members: [
            {
              id: '*',
              name: '*',
              actions: ['write'],
              publication: {
                actions: ['write'],
              },
              subscription: {
                actions: ['write'],
              },
            },
          ],
          sfuBots: [
            {
              actions: ['write'],
              forwardings: [
                {
                  actions: ['write'],
                },
              ],
            },
          ],
        },
      ],
    },
  },
}).encode(secret);

export class SkyWayService {
  private context: SkyWayContext | null = null;
  private room: P2PRoom | null = null;
  private localAudioStream: MediaStream | null = null;
  private remoteAudioStream: MediaStream | null = null;
  private audioEnabled = false;

  // SkyWayのコンテキストを初期化
  async initialize(userId: string) {
    try {
      const context = await SkyWayContext.Create(token);

      this.context = context;
      return true;
    } catch (error) {
      console.error('SkyWay initialization error:', error);
      return false;
    }
  }

  // ルームに参加
  async joinRoom(roomId: string, userId: string) {
    if (!this.context) {
      throw new Error('SkyWay context not initialized');
    }

    try {
      // ルームに参加
      const room = await SkyWayRoom.FindOrCreate(this.context, {
        type: 'p2p',
        name: roomId,
      });

      this.room = room as P2PRoom;

      // ルームにメンバーとして参加
      const localMember = await this.room.join({
        name: userId,
        metadata: JSON.stringify({ userId }),
      });

      // 音声ストリームを公開
      const audioStream = await SkyWayStreamFactory.createMicrophoneAudioStream();
      await localMember.publish(audioStream);

      // 既存のパブリケーションを購読
      this.subscribeToExistingPublications(userId);

      // 新しいパブリケーションが公開されたときのイベントリスナー
      this.room.onStreamPublished.add((e) => {
        this.subscribeToPublication(e.publication, userId);
      });

      return true;
    } catch (error) {
      console.error('Error joining room:', error);
      return false;
    }
  }

  // 音声ストリームの取得と公開
  async publishAudio(userId: string) {
    if (!this.room) {
      throw new Error('Room not joined');
    }

    try {
      // ルームにメンバーとして参加
      const localMember = await this.room.join({
        name: userId,
        metadata: JSON.stringify({ userId }),
      });
      // 音声ストリームを取得
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      // 音声ストリームを公開
      const audioStream = await SkyWayStreamFactory.createMicrophoneAudioStream();
      await localMember.publish(audioStream);

      this.audioEnabled = true;
      return true;
    } catch (error) {
      console.error('Error publishing audio:', error);
      return false;
    }
  }

  // 既存のパブリケーションを購読
  private async subscribeToExistingPublications(userId: string) {
    if (!this.room) return;

    for (const publication of this.room.publications) {
      await this.subscribeToPublication(publication, userId);
    }
  }

  // パブリケーションを購読
  private async subscribeToPublication(publication: RoomPublication, userId: string) {
    if (!this.room) return;

    // 自分自身の公開なら購読しない
    const localMember = this.room.members.find(member => member.id === userId);
    if (publication.publisher.id === localMember?.id) return;

    try {
      // パブリケーションを購読
      const subscription = await localMember?.subscribe(publication.id);
      // 音声ストリームを処理
      if (subscription?.subscription.stream instanceof RemoteAudioStream) {
        // リモートストリームに追加
        if (!this.remoteAudioStream) {
          this.remoteAudioStream = new MediaStream();
        }
        this.remoteAudioStream.addTrack(subscription.subscription.stream.track);
      }
    } catch (error) {
      console.error('Error subscribing to publication:', error);
    }
  }

  // 音声のON/OFF切り替え
  toggleAudio() {
    if (!this.localAudioStream) return false;

    const audioTracks = this.localAudioStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    this.audioEnabled = !this.audioEnabled;
    audioTracks.forEach(track => {
      track.enabled = this.audioEnabled;
    });

    return this.audioEnabled;
  }

  // 音声の状態を取得
  isAudioEnabled() {
    return this.audioEnabled;
  }

  // リモートの音声ストリームを取得
  getRemoteAudioStream() {
    return this.remoteAudioStream;
  }

  // ルームから退出
  async leaveRoom(userId: string) {
    if (!this.room) return;

    try {
      // メディアストリームの停止
      if (this.localAudioStream) {
        this.localAudioStream.getTracks().forEach(track => track.stop());
        this.localAudioStream = null;
      }

      // リモートストリームのクリア
      this.remoteAudioStream = null;

      // ルームから退出
      const localMember = this.room.members.find(member => member.id === userId);
      if (localMember) {
        await this.room.leave(localMember);
      }
      this.room = null;
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  // コンテキストを閉じる
  async dispose() {
    await this.leaveRoom('');

    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }
  }
}
