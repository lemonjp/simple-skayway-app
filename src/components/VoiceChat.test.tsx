import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoiceChat from './VoiceChat';
import { SkyWayService } from '@/lib/skyway';
import { socketService } from '@/lib/socket';

// SkyWayServiceのモック
jest.mock('@/lib/skyway', () => ({
  SkyWayService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(true),
    joinRoom: jest.fn().mockResolvedValue(true),
    publishAudio: jest.fn().mockResolvedValue(true),
    toggleAudio: jest.fn().mockImplementation(() => true),
    getRemoteAudioStream: jest.fn().mockReturnValue(null),
    leaveRoom: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn().mockResolvedValue(undefined),
  })),
}));

// socketServiceのモック
jest.mock('@/lib/socket', () => ({
  socketService: {
    initialize: jest.fn(),
    onUserList: jest.fn().mockImplementation((callback) => {
      // テスト用にコールバックを呼び出す
      setTimeout(() => callback([
        { id: 'user1', name: 'User 1', isOnline: true },
        { id: 'user2', name: 'User 2', isOnline: true },
      ]), 0);
      return jest.fn(); // unsubscribe関数
    }),
    onIncomingCall: jest.fn().mockReturnValue(jest.fn()),
    onCallAnswered: jest.fn().mockReturnValue(jest.fn()),
    onCallEnded: jest.fn().mockReturnValue(jest.fn()),
    onMicToggled: jest.fn().mockReturnValue(jest.fn()),
    callUser: jest.fn(),
    answerCall: jest.fn(),
    endCall: jest.fn(),
    disconnect: jest.fn(),
    notifyMicToggle: jest.fn(),
  },
}));

// HTML Media Element APIのモック
Object.defineProperty(window, 'MediaStream', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    addTrack: jest.fn(),
  })),
});

describe('VoiceChat Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component and initializes services', async () => {
    render(<VoiceChat userId="testuser" userName="Test User" token="test-token" />);

    // 接続状態が最初は未接続
    expect(screen.getByText('接続状態:')).toBeInTheDocument();

    // SkyWayServiceとsocketServiceが初期化される
    await waitFor(() => {
      expect(SkyWayService).toHaveBeenCalled();
      expect(socketService.initialize).toHaveBeenCalledWith('test-token', expect.any(Object));
    });
  });

  it('displays online users', async () => {
    render(<VoiceChat userId="testuser" userName="Test User" token="test-token" />);

    // オンラインユーザーが表示される
    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();
    });
  });

  it('calls a user when call button is clicked', async () => {
    render(<VoiceChat userId="testuser" userName="Test User" token="test-token" />);

    // オンラインユーザーが表示されるまで待つ
    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument();
    });

    // 通話ボタンをクリック
    const callButtons = screen.getAllByText('通話');
    fireEvent.click(callButtons[0]);

    // SkyWayServiceのメソッドとsocketServiceの通話開始が呼ばれる
    await waitFor(() => {
      expect(SkyWayService.mock.results[0].value.joinRoom).toHaveBeenCalled();
      expect(SkyWayService.mock.results[0].value.publishAudio).toHaveBeenCalled();
      expect(socketService.callUser).toHaveBeenCalled();
    });
  });
});
