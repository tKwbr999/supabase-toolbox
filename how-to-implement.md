# Supabase Edge Function (hello-world) 開発手順

このドキュメントは、Supabase Edge Function `hello-world` を作成し、PlaywrightでE2Eテストを実装するまでの手順をまとめたものです。

## 1. 前提条件

以下のツールがインストールされていることを確認してください。

*   [Supabase CLI](https://supabase.com/docs/guides/cli)
*   [Node.js](https://nodejs.org/) (npmを含む)

## 2. Supabaseプロジェクト初期化

プロジェクトディレクトリで以下のコマンドを実行し、Supabaseプロジェクトを初期化します。VSCodeを使用している場合は、Denoの設定を生成することをお勧めします。

```bash
supabase init
# Generate VS Code settings for Deno? [y/N] y
```

これにより、`.vscode/settings.json` が生成され、Denoの型チェックやフォーマットが有効になります。

## 3. Edge Function作成

`hello-world` という名前のEdge Functionを作成します。

```bash
supabase functions new hello-world
```

これにより、`supabase/functions/hello-world/index.ts` が生成されます。

## 4. 関数コード実装

生成された `supabase/functions/hello-world/index.ts` を開き、以下のコードを記述します。

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // リクエストボディから 'name' を取得
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  // JSONレスポンスを返す
  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
```

## 5. テスト環境準備

PlaywrightでE2Eテストを行うための環境を準備します。

### 5.1. npmプロジェクト初期化

```bash
npm init -y
```

### 5.2. 必要なパッケージのインストール

Playwright、Node.jsの型定義、および環境変数を扱うための `dotenv` をインストールします。

```bash
npm install --save-dev @playwright/test @types/node dotenv
```

### 5.3. TypeScript設定 (`tsconfig.json`)

プロジェクトルートに `tsconfig.json` を作成し、以下の内容を記述します。これにより、Node.jsの型定義が利用可能になり、モジュール解決が正しく行われます。

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "node", // 追加
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"] // Node.jsの型定義を有効にする
  },
  "include": [
    "supabase/functions/**/*.ts" // 対象ファイルを指定
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### 5.4. Playwright設定 (`playwright.config.ts`)

プロジェクトルートに `playwright.config.ts` を作成し、テストディレクトリを指定します。

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './supabase/functions/tests', // テストディレクトリを指定
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### 5.5. Playwrightブラウザのインストール

テストに必要なブラウザをインストールします。

```bash
npx playwright install
```

### 5.6. npmテストスクリプトの設定

`package.json` の `scripts.test` を修正して、`npm test` でPlaywrightが実行されるようにします。

```json
{
  // ... (他の設定)
  "scripts": {
    "test": "playwright test" // ここを修正
  },
  // ... (他の設定)
}
```

### 5.7. 環境変数ファイル (`.env`) の作成

プロジェクトルートに `.env` ファイルを作成し、SupabaseのAnon Keyを設定します。このファイルはGit管理に含めないでください。

```.env
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY # supabase start の出力から取得したキーを設定
```

`YOUR_SUPABASE_ANON_KEY` の部分を、`supabase start` コマンドを実行した際に表示される `anon key` に置き換えてください。

### 5.8. `.gitignore` の更新

`.gitignore` ファイルに `.env` を追加し、Gitの追跡対象から除外します。

```.gitignore
node_modules
.vscode
.env
```

## 6. テストコード実装

`supabase/functions/tests/hello-world.spec.ts` (ファイル名を `.spec.ts` に変更) を作成し、以下のテストコードを記述します。

このコードは `dotenv` を使用して `.env` ファイルから `SUPABASE_ANON_KEY` を読み込みます。キーが設定されていない場合はエラーが発生します。

```typescript
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

// .envファイルから環境変数を読み込む
dotenv.config();

// Supabase Anon Keyを環境変数から取得
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const FUNCTION_URL = 'http://localhost:54321/functions/v1/hello-world';

// 環境変数が設定されていない場合はエラーをスロー
if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is not defined in the environment variables. Please check your .env file.');
}

test('hello-world function should return a greeting', async ({ request }) => {
  const name = 'Playwright';
  const response = await request.post(FUNCTION_URL, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    data: { name: name },
  });

  // レスポンスステータスを確認
  expect(response.ok()).toBeTruthy();

  // レスポンスボディを確認
  const responseBody = await response.json();
  expect(responseBody).toEqual({ message: `Hello ${name}!` });
});
```

## 7. テスト実行

以下の手順でテストを実行します。

### 7.1. Supabaseスタック起動

```bash
supabase start
```

### 7.2. Edge Functionsサーバー起動

別のターミナルを開き、以下のコマンドを実行します。

```bash
supabase functions serve
```

### 7.3. Playwrightテスト実行

テストを実行する前に、`.env` ファイルに正しい `SUPABASE_ANON_KEY` が設定されていることを確認してください。

```bash
npm test
```

テストが成功すれば、`hello-world` 関数の実装とテストは完了です。