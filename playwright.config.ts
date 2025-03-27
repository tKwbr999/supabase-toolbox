import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// .envファイルを読み込む
dotenv.config();

// テスト対象のエンドポイントを環境変数から取得
const testTarget = process.env.TEST_TARGET || 'local'; // デフォルトはlocal

// baseURLを設定
let baseURL;
if (testTarget === 'local') {
  baseURL = 'http://localhost:54321/functions/v1/';
} else if (testTarget === 'deployed') {
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
  testDir: './supabase/functions/tests', // テストディレクトリを指定
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