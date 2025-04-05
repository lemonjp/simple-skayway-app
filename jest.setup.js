import '@testing-library/jest-dom';

// NavigatorのMediaDevicesをモック
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([
        {
          kind: 'audio',
          stop: jest.fn(),
          enabled: true,
        },
      ]),
      getAudioTracks: jest.fn().mockReturnValue([
        {
          kind: 'audio',
          stop: jest.fn(),
          enabled: true,
        },
      ]),
    }),
  },
});

// HTMLMediaElementのモック
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined),
});

// Cookieのモック
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation((name) => {
      if (name === 'auth_token') {
        return { value: 'test-token' };
      }
      return null;
    }),
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

// Fetchのモック
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  })
);
