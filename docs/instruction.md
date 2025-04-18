# Supabase Edge Function 開発・テスト・デプロイ手順

## 技術スタック

*   Node.js
*   npm
*   Supabase CLI
*   Docker
*   TypeScript
*   Playwright
*   dotenv
*   Deno
*   GitHub Actions

このドキュメントは、Supabase Edge Function の開発からテスト、デプロイまでの一連の手順をまとめた汎用的なガイドです。

## 1. 前提条件

以下のツールがインストールされていることを確認してください。

*   [Node.js](https://nodejs.org/) (npmを含む)
*   [Supabase CLI](https://supabase.com/docs/guides/cli) (インストール方法は公式ドキュメントを参照してください)
*   [Docker](https://www.docker.com/) (ローカルテスト環境で使用)

## 2. 開発環境のセットアップ

### 2.1. Supabaseプロジェクト初期化

プロジェクトディレクトリで以下のコマンドを実行し、Supabaseプロジェクトを初期化します。VSCodeを使用している場合は、Denoの設定を生成することをお勧めします。

```bash
supabase init
# Generate VS Code settings for Deno? [y/N] y
```

### 2.2. npmプロジェクト初期化

```bash
npm init -y
```

### 2.3. 必要なパッケージのインストール

Playwright、Node.jsの型定義、および環境変数を扱うための `dotenv` をインストールします。

```bash
npm install --save-dev @playwright/test @types/node dotenv
```

### 2.4. TypeScript設定 (`tsconfig.json`)

プロジェクトルートに `tsconfig.json` を作成し、以下の内容を記述します。

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"]
  },
  "include": [
    "supabase/functions/**/*.ts" // 必要に応じて調整
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### 2.5. Playwright設定 (`playwright.config.ts`)

プロジェクトルートに `playwright.config.ts` を作成します。テスト対象のエンドポイント (`baseURL`) を環境変数 `TEST_TARGET` で切り替えられるように設定します。

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
  // ローカル開発環境のエンドポイント (supabase startで表示されるURL)
  baseURL = process.env.SUPABASE_LOCAL_FUNCTIONS_URL || 'http://localhost:54321/functions/v1/';
} else if (testTarget === 'deployed') {
  // デプロイ先のエンドポイント
  baseURL = process.env.SUPABASE_DEPLOYED_FUNCTIONS_URL;
  if (!baseURL) {
    console.error('Error: SUPABASE_DEPLOYED_FUNCTIONS_URL is not set in .env file for deployed target.');
    process.exit(1); // エラーで終了
  }
} else {
  console.warn(`Warning: Unknown TEST_TARGET "${testTarget}". Defaulting to local.`);
  baseURL = process.env.SUPABASE_LOCAL_FUNCTIONS_URL || 'http://localhost:54321/functions/v1/';
}

export default defineConfig({
  testDir: './supabase/functions/tests', // テストファイルのディレクトリ
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
    // 必要に応じて他のブラウザ設定を追加
  ],
});
```

### 2.6. Playwrightブラウザのインストール

```bash
npx playwright install --with-deps
```

### 2.7. npmテストスクリプトの設定

`package.json` の `scripts.test` を修正して、`npm test` でPlaywrightが実行されるようにします。

```json
{
  // ... (他の設定)
  "scripts": {
    "test": "playwright test"
  },
  // ... (他の設定)
}
```

### 2.8. 環境変数ファイル (`.env`) の作成

プロジェクトルートに `.env` ファイルを作成し、必要な環境変数を設定します。このファイルはGit管理に含めないでください。

```dotenv
# ローカルテスト用 (supabase start の出力から取得)
SUPABASE_ANON_KEY=YOUR_LOCAL_SUPABASE_ANON_KEY
SUPABASE_LOCAL_FUNCTIONS_URL=http://localhost:54321/functions/v1/

# デプロイ先テスト用 (Supabaseダッシュボードから取得)
SUPABASE_DEPLOYED_ANON_KEY=YOUR_DEPLOYED_SUPABASE_ANON_KEY
SUPABASE_DEPLOYED_FUNCTIONS_URL=https://<your-project-id>.supabase.co/functions/v1/
```

`YOUR_LOCAL_SUPABASE_ANON_KEY`, `YOUR_DEPLOYED_SUPABASE_ANON_KEY`, `<your-project-id>` を実際の値に置き換えてください。

### 2.9. `.gitignore` の更新

`.gitignore` ファイルに以下を追加し、Gitの追跡対象から除外します。

```.gitignore
node_modules
.vscode
.env
test-results/
playwright-report/
```

## 3. Edge Function の実装

### 3.1. 関数作成

`<function_name>` という名前のEdge Functionを作成します。

```bash
supabase functions new <function_name>
```

これにより、`supabase/functions/<function_name>/index.ts` が生成されます。

### 3.2. コード実装

生成された `supabase/functions/<function_name>/index.ts` を開き、関数ロジックを実装します。

```typescript
// 例: リクエストボディから 'name' を受け取り、挨拶を返す関数
import { serve } from "https://deno.land/std@0.168.0/http/server.ts" // バージョンは適宜更新

serve(async (req) => {
  try {
    const { name } = await req.json();
    const data = {
      message: `Hello ${name}!`,
    };

    return new Response(
      JSON.stringify(data),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
})
```

## 4. テストの実装 (Playwright)

### 4.1. テストコード作成

`supabase/functions/tests/<function_name>.spec.ts` を作成し、テストコードを記述します。

```typescript
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

// .envファイルから環境変数を読み込む
dotenv.config();

// Anon Keyを環境変数から取得 (テスト対象に応じて切り替え)
const testTarget = process.env.TEST_TARGET || 'local';
const SUPABASE_ANON_KEY = testTarget === 'deployed'
  ? process.env.SUPABASE_DEPLOYED_ANON_KEY
  : process.env.SUPABASE_LOCAL_ANON_KEY;

// 関数名を指定
const functionName = '<function_name>';

// 環境変数が設定されていない場合はエラーをスロー
if (!SUPABASE_ANON_KEY) {
  throw new Error(`Anon Key (SUPABASE_${testTarget.toUpperCase()}_ANON_KEY) is not defined. Please check your .env file.`);
}

test(`${functionName} function should return a greeting`, async ({ request }) => {
  const name = 'TestUser';
  const response = await request.post(`${functionName}`, { // baseURLからの相対パス
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

// 必要に応じて他のテストケースを追加
```

`<function_name>` を実際の関数名に置き換えてください。

## 5. テストの実行

### 5.1. ローカル環境でのテスト

1.  **Supabase サービスの起動:**
    ターミナルで以下のコマンドを実行し、ローカルの Supabase 環境を起動します。

    ```bash
    supabase start
    ```
    表示される `API URL` と `anon key` を `.env` ファイルの `SUPABASE_LOCAL_FUNCTIONS_URL` と `SUPABASE_ANON_KEY` に設定します。

2.  **テストの実行:**
    別のターミナルで以下のコマンドを実行します。

    ```bash
    npm test
    # または
    TEST_TARGET=local npm test
    ```

3.  **Supabase サービスの停止:**
    テストが完了したら、以下のコマンドで Supabase サービスを停止します。

    ```bash
    supabase stop
    ```

### 5.2. デプロイ先環境でのテスト

1.  **環境変数の確認:**
    `.env` ファイルにデプロイ先の `SUPABASE_DEPLOYED_ANON_KEY` と `SUPABASE_DEPLOYED_FUNCTIONS_URL` が正しく設定されていることを確認します。

2.  **テストの実行:**
    以下のコマンドを実行します。

    ```bash
    TEST_TARGET=deployed npm test
    ```


### 5.3. GitHub Actions でのテストと自動デプロイ (CI/CD)

GitHub Actions を使用して、`main` ブランチへの push をトリガーに自動テストを実行し、テストが成功した場合に自動でデプロイすることができます。Pull request 時はテストのみが実行されます。

1.  **ワークフローファイルの作成:**
    `.github/workflows/test.yml` を作成し、以下のようなワークフローを定義します。

    ```yaml
    name: Test and Deploy # ワークフロー名を変更

    on:
      push:
        branches: [ main ] # mainブランチへのpush時のみ実行
      # pull_request: # Pull Request時はデプロイしないためコメントアウトまたは削除
      #   branches: [ main ]

    jobs:
      test_and_deploy: # ジョブ名を変更
        runs-on: ubuntu-latest

        steps:
        - name: Checkout repository
          uses: actions/checkout@v4

        - name: Set up Node.js
          uses: actions/setup-node@v4
          with:
            node-version: '20' # プロジェクトで使用するバージョン
            cache: 'npm'

        - name: Install dependencies
          run: npm ci

        - name: Install Playwright browsers
          run: npx playwright install --with-deps

        - name: Set up Supabase CLI
          uses: supabase/setup-cli@v1
          with:
            version: latest # または特定のバージョン

        - name: Start Supabase services
          run: supabase start

        - name: Run tests
          env:
            SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }} # ローカルテスト用のAnon Key
            # TEST_TARGET はデフォルトで 'local' が使用される
          run: npm test

        # mainブランチへのpush時のみデプロイを実行
        - name: Deploy to Supabase
          if: github.ref == 'refs/heads/main'
          env:
            SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }} # Supabaseアクセストークン
            SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}   # SupabaseプロジェクトID
          # 特定の関数 '<function_name>' をデプロイ (実際の関数名に置き換える)
          run: supabase functions deploy <function_name> --project-ref $SUPABASE_PROJECT_ID

        - name: Stop Supabase services
          if: always() # テストやデプロイが失敗しても必ず実行
          run: supabase stop
    ```
    **注意:** 上記 YAML 内の `<function_name>` は、実際にデプロイしたい関数名 (例: `hello-world`) に置き換えてください。

2.  **Secrets の設定:**
    GitHub リポジトリの **Settings** > **Secrets and variables** > **Actions** で、以下の Secrets を作成します。
    *   **`SUPABASE_ANON_KEY`**: ローカルテスト用の Anon Key (通常 `supabase start` で表示されるもの)。
    *   **`SUPABASE_ACCESS_TOKEN`**: Supabase のアクセストークン (Supabase ダッシュボード > Account > Access Tokens で生成)。
    *   **`SUPABASE_PROJECT_ID`**: デプロイ先の Supabase プロジェクト ID (Supabase ダッシュボード > Project Settings > General settings で確認)。

## 6. デプロイ

### 6.1. 手動デプロイ

Supabase CLIを使用して、対象の関数を手動でデプロイします。

```bash
supabase functions deploy <function_name> --project-ref <your-project-id>
```

`<function_name>` と `<your-project-id>` を実際の値に置き換えてください。`--project-ref` は、Supabaseプロジェクトがリンクされていない場合に必要です。リンクされている場合は不要です (`supabase link --project-ref <your-project-id>`)。

デプロイ後、必要に応じてデプロイ先環境でのテスト (`TEST_TARGET=deployed npm test`) を実行して動作を確認します。

### 6.2. 自動デプロイ (GitHub Actions)

上記「5.3. GitHub Actions でのテストと自動デプロイ」で設定したワークフローにより、`main` ブランチに push されると、テスト成功後に自動で関数がデプロイされます。