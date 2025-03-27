# Supabase Edge Functions デプロイ手順

## 1. 関数のデプロイ

Supabase CLIを使用して、対象の関数をデプロイします。

```bash
supabase functions deploy <function_name>
```

例: `hello-world` 関数をデプロイする場合

```bash
supabase functions deploy hello-world
```

デプロイが成功すると、プロジェクトIDとデプロイされた関数のリストが表示されます。

## 2. E2Eテストの準備

デプロイされた関数が正しく動作するかを確認するために、E2Eテストを実行します。テスト実行時にローカル環境とデプロイ先の環境を切り替えられるように設定します。

### 2.1. 環境変数の設定

`.env` ファイルに、デプロイされたSupabase FunctionsのエンドポイントURLを追加します。

```dotenv
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_FUNCTIONS_URL=https://<your-project-id>.supabase.co/functions/v1/
```

`<your-project-id>` は実際のプロジェクトIDに置き換えてください。今回の例では `qlvsrpsfvmeocrgmeoub` です。

### 2.2. Playwright設定の変更

`playwright.config.ts` を修正し、環境変数 `TEST_TARGET` を使用してテスト対象のエンドポイント (`baseURL`) を動的に設定します。

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config();

// テスト対象のエンドポイントを環境変数から取得
const testTarget = process.env.TEST_TARGET || 'local'; // デフォルトはlocal

// baseURLを設定
let baseURL;
if (testTarget === 'local') {
  // ローカル開発環境のエンドポイント
  baseURL = 'http://localhost:54321/functions/v1/';
} else if (testTarget === 'deployed') {
  // デプロイ先のエンドポイント
  baseURL = process.env.SUPABASE_FUNCTIONS_URL;
  if (!baseURL) {
    console.error('Error: SUPABASE_FUNCTIONS_URL is not set in .env file for deployed target.');
    process.exit(1); // エラーで終了
  }
} else {
  console.warn(`Warning: Unknown TEST_TARGET "${testTarget}". Defaulting to local.`);
  baseURL = 'http://localhost:54321/functions/v1/';
}

export default defineConfig({
  testDir: './supabase/functions/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: baseURL, // baseURLを設定
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

`dotenv` パッケージがインストールされていない場合は、インストールします。

```bash
npm install -D dotenv
```
(今回は既にインストールされていました)

## 3. E2Eテストの実行

環境変数 `TEST_TARGET` を設定してテストを実行します。

### 3.1. ローカル環境でのテスト

```bash
npm test
# または
TEST_TARGET=local npm test
```

### 3.2. デプロイ先環境でのテスト

```bash
TEST_TARGET=deployed npm test
```

テストが成功すれば、デプロイされた関数が期待通りに動作していることが確認できます。