# Simple SkyWay Voice Chat App

SkyWayを使用したシンプルな音声通話アプリケーションです。Next.js、Socket.IO、SkyWay SDKを使用して実装されています。

## 機能

- ユーザー認証（Supabase Authentication）
- オンラインユーザーの表示
- 1対1の音声通話
- マイクのON/OFF切り替え

## 必要条件

- Node.js 18.0.0以上
- SkyWayのアカウントとアプリケーションID
- Supabaseのアカウントと認証設定
- 環境変数の設定

## 環境変数の設定

`.env.local`ファイルをプロジェクトのルートに作成し、以下の環境変数を設定してください：

```env
NEXT_PUBLIC_SKYWAY_APP_ID=your-skyway-app-id
NEXT_PUBLIC_SKYWAY_SECRET_KEY=your-skyway-secret-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## インストール

```bash
# 依存パッケージのインストール
npm install
```

## 起動方法

アプリケーションを実行するには、2つのサーバーを起動する必要があります：

1. Next.jsアプリケーションサーバー：

```bash
npm run dev
```

2. Socket.IOサーバー：

```bash
npm run socket
```

すべてのサーバーを起動後、ブラウザで以下のURLにアクセスしてください：
http://localhost:3000

## 使用方法

1. ログイン画面でユーザー名を入力してログイン
2. オンラインユーザーの一覧が表示されます
3. 通話したいユーザーの「通話」ボタンをクリック
4. 相手が応答すると通話が開始されます
5. マイクのON/OFFボタンで音声のミュートが可能
6. 「通話終了」ボタンで通話を終了

## 技術スタック

- [Next.js](https://nextjs.org/) - Webアプリケーションフレームワーク
- [SkyWay SDK](https://skyway.ntt.com/) - WebRTCプラットフォーム
- [Socket.IO](https://socket.io/) - リアルタイム通信
- [Supabase](https://supabase.com/) - 認証基盤
- [Tailwind CSS](https://tailwindcss.com/) - スタイリング

## 注意事項

- 開発環境での実行を想定しています
- 本番環境にデプロイする場合は、適切なセキュリティ対策を実施してください
- ブラウザのマイク使用許可が必要です

## ライセンス

MIT
