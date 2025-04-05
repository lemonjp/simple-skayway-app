import { redirect } from 'next/navigation';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import VoiceChat from '@/components/VoiceChat';
import { getAuthToken } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';

type UserData = {
  sub: string;
  name: string;
} | null;

export default async function HomePage() {
  // 認証チェック
  const isAuth = await isAuthenticated();

  if (!isAuth) {
    redirect('/auth/login');
  }

  // ユーザー情報を取得
  const userData: UserData = await getCurrentUser();
  const token = await getAuthToken() || '';

  if (!userData || !userData.sub || !userData.name) {
    redirect('/auth/login');
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">SkyWay 音声通話アプリ</h1>
          <div className="flex items-center space-x-4">
            {userData && (
              <span className="text-gray-700">
                {userData.name} さん
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <VoiceChat
          userId={userData.sub as string}
          userName={userData.name as string}
          token={token}
        />
      </div>
    </main>
  );
}
