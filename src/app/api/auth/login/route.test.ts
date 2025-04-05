import { NextRequest } from 'next/server';
import { POST } from './route';

// Supabaseのモック
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

// JWT関連のモック
jest.mock('@/lib/auth', () => ({
  signToken: jest.fn().mockResolvedValue('mocked-token'),
  setAuthCookie: jest.fn(),
}));

import { supabase } from '@/lib/supabase';

describe('Login API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email or password is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: '', password: '' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('メールアドレスとパスワードを入力してください');
  });

  it('should return 401 if login credentials are invalid', async () => {
    // Supabaseのモックを設定
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('メールアドレスまたはパスワードが間違っています');
  });

  it('should return 200 and set cookie for successful login', async () => {
    // Supabaseのモックを設定
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { name: 'Test User' },
        },
      },
      error: null,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'correctpassword' }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // クッキーが設定されていることを確認
    expect(response.headers.get('Set-Cookie')).toContain('auth_token');
  });
});
