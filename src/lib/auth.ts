import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.JWT_SECRET || '';

if (!secretKey) {
  throw new Error('Missing JWT_SECRET environment variable');
}

type UserData = {
  sub: string;
  name: string;
} | null;

// JWTトークンを生成する
export async function signToken(payload: any) {
  const secret = new TextEncoder().encode(secretKey);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret);
  return token;
}

// JWTトークンを検証する
export async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(secretKey);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// トークンをCookieに保存する
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

// Cookieからトークンを取得する
export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value;
}

// ユーザーが認証されているか確認する
export async function isAuthenticated() {
  const token = await getAuthToken();
  if (!token) return false;

  const payload = await verifyToken(token);
  return !!payload;
}

// 現在のユーザー情報を取得する
export async function getCurrentUser(): Promise<UserData> {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || typeof payload.sub !== 'string' || typeof payload.name !== 'string') {
    return null;
  }

  return {
    sub: payload.sub,
    name: payload.name,
  };
}
