import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

// .envファイルから環境変数を読み込む
dotenv.config();

// Supabase Anon Keyを環境変数から取得
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const FUNCTION_URL = process.env.SUPABASE_FUNCTION_URL || 'http://localhost:54321/functions/v1/hello-world';

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