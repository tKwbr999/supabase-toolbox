# テストの実行方法

このドキュメントでは、ローカル環境、デプロイ先の環境、および GitHub Actions でテストを実行する方法について説明します。

## 1. ローカル環境でのテスト

ローカル環境で Supabase Functions のテストを実行するには、以下の手順に従います。

### 前提条件

*   Node.js と npm がインストールされていること。
*   Supabase CLI がインストールされていること (`npm install -g supabase`)。
*   プロジェクトの依存関係がインストールされていること (`npm install`)。
*   Playwright ブラウザがインストールされていること (`npx playwright install --with-deps`)。
*   `.env` ファイルに `SUPABASE_ANON_KEY` が設定されていること。`.env.example` をコピーして作成してください。

### 手順

1.  **Supabase サービスの起動:**
    ターミナルで以下のコマンドを実行し、ローカルの Supabase 環境を起動します。

    ```bash
    supabase start
    ```

    これにより、Docker コンテナが起動し、ローカルで Supabase の各サービス（データベース、Auth、Functions など）が利用可能になります。

2.  **テストの実行:**
    別のターミナルで以下のコマンドを実行し、Playwright テストを実行します。

    ```bash
    npm test
    ```

    テストは `supabase/functions/tests` ディレクトリ内の `*.spec.ts` ファイルを実行します。テスト結果はターミナルに出力されます。

3.  **Supabase サービスの停止:**
    テストが完了したら、以下のコマンドで Supabase サービスを停止します。

    ```bash
    supabase stop
    ```

## 2. デプロイ先環境でのテスト

デプロイされた Supabase Functions に対してテストを実行することも可能です。

### 前提条件

*   Node.js と npm がインストールされていること。
*   プロジェクトの依存関係がインストールされていること (`npm install`)。
*   Playwright ブラウザがインストールされていること (`npx playwright install --with-deps`)。
*   デプロイ先の Supabase プロジェクトの **Anon Key** と **Functions URL** がわかっていること。これらは Supabase ダッシュボードのプロジェクト設定 > API で確認できます。

### 手順

1.  **環境変数の設定:**
    テストを実行するターミナルで、以下の環境変数を設定します。

    ```bash
    export SUPABASE_ANON_KEY="YOUR_DEPLOYED_ANON_KEY"
    export SUPABASE_FUNCTION_URL="YOUR_DEPLOYED_FUNCTIONS_URL/hello-world" # テスト対象のFunction名を追加
    ```

    `YOUR_DEPLOYED_ANON_KEY` と `YOUR_DEPLOYED_FUNCTIONS_URL` を実際の値に置き換えてください。

2.  **テストの実行:**
    以下のコマンドを実行し、Playwright テストを実行します。

    ```bash
    npm test
    ```

    テストは、指定されたデプロイ先の Function に対して実行されます。

## 3. GitHub Actions でのテスト

このリポジトリでは、`main` ブランチへの push がトリガーとなり、GitHub Actions 上で自動的にテストが実行され、テストが成功すると自動でデプロイが行われます。Pull request 時はテストのみが実行されます。

### ワークフロー

ワークフローは `.github/workflows/test.yml` で定義されています。主なステップは以下の通りです。

1.  リポジトリのコードをチェックアウトします。
2.  Node.js 環境をセットアップします。
3.  プロジェクトの依存関係をインストールします (`npm ci`)。
4.  Playwright のブラウザをインストールします (`npx playwright install --with-deps`)。
5.  `supabase/setup-cli` アクションを使用して Supabase CLI をセットアップします。
6.  ローカルの Supabase 環境を起動します (`supabase start`)。
7.  テストを実行します (`npm test`)。
    *   テストに必要な `SUPABASE_ANON_KEY` は、リポジトリの Secrets (`secrets.SUPABASE_ANON_KEY`) から取得されます。ローカル Supabase 環境のデフォルトの Anon Key を設定してください。
    *   テスト対象の URL は、`supabase start` で起動したローカル環境の Functions URL (`http://127.0.0.1:54321/functions/v1/hello-world`) が自動的に使用されます。
8.  **(`main` ブランチへの push 時のみ) テストが成功した場合、`hello-world` 関数を Supabase にデプロイします (`supabase functions deploy hello-world`)。**
    *   デプロイには `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_ID` の Secrets が必要です。
9.  Supabase 環境を停止します (`supabase stop`)。

### Secrets の設定

GitHub Actions でテストとデプロイを実行するには、リポジトリに以下の Secrets を設定する必要があります。

1.  **`SUPABASE_ANON_KEY`**:
    *   **目的**: ローカル環境でのテスト実行時に使用されます。
    *   **値**: ローカルの Supabase 環境で使用されるデフォルトの Anon Key。通常、`supabase start` を実行した際にターミナルに出力される `anon key` です。不明な場合は、`supabase status` コマンドでも確認できます。
2.  **`SUPABASE_ACCESS_TOKEN`**:
    *   **目的**: Supabase Functions のデプロイ時に認証で使用されます。
    *   **値**: Supabase のアクセストークン。Supabase ダッシュボードの **Account** > **Access Tokens** で生成できます。**New token** をクリックし、適切な名前（例: `GITHUB_ACTIONS_DEPLOY`）を付けて生成してください。
3.  **`SUPABASE_PROJECT_ID`**:
    *   **目的**: デプロイ先の Supabase プロジェクトを指定するために使用されます。
    *   **値**: Supabase プロジェクトの ID。Supabase ダッシュボードのプロジェクト設定 > General settings で確認できます。

**設定手順:**

1.  GitHub リポジトリの **Settings** > **Secrets and variables** > **Actions** に移動します。
2.  **New repository secret** をクリックします。
3.  上記の Secret 名（例: `SUPABASE_ANON_KEY`）を **Name** に入力します。
4.  対応する値を **Secret** に貼り付けます。
5.  **Add secret** をクリックします。
6.  他の必要な Secret についても同様の手順を繰り返します。

これで、GitHub Actions でテストとデプロイが実行される際に、これらの Secrets が環境変数としてワークフローに渡されます。