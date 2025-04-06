# Supabase ヘルスチェック関数

GoでビルドしたWASMモジュールを利用して、ヘルスチェック情報を提供するSupabase Edge Functionです。

## ファイル構成

```
hc/
├── README.md        # このファイル
├── deno.json        # Deno設定ファイル
├── health.wasm      # ビルドされたWASMモジュール
├── index.ts         # メインのEdge Function
├── main.go          # GoソースコードファイルでWASMにビルドされる
├── test.ts          # テストスクリプト
└── wasm_handler.ts  # WASM処理ユーティリティ
```

## 開発方法

### 前提条件

- [Deno](https://deno.land/) 2.2.0以上
- [Go](https://golang.org/) 1.21以上（WASMビルド用）
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### WASMのビルド

```bash
# Goコードからhealth.wasmをビルド
GOOS=wasip1 GOARCH=wasm go build -o health.wasm main.go
```

### ローカル実行

```bash
# Deno単体で実行
deno task start

# 開発モード（ホットリロード）
deno task dev

# テスト実行
deno task test
```

### Supabaseデプロイ

```bash
# Supabase Functionsとしてデプロイ
supabase functions deploy hc --no-verify-jwt

# 環境変数設定（必要に応じて）
supabase secrets set ENV_PREFIX=prod_
```

## APIエンドポイント

- **GET /hc/health** - ヘルスチェック情報を返す

### レスポンス例

```json
{
  "status": "healthy",
  "timestamp": "2025-03-29T12:34:56Z",
  "version": "1.0.1",
  "service": "prod_health-checker",
  "requestId": "b7e44f9e-54e2-4d8f-a9b9-d631eb4f89ac"
}
```

## 技術解説

このモジュールは、GoでビルドされたWASMモジュールをDeno環境で実行し、ヘルスチェック情報を提供します。WASI APIの互換性を自動的に処理する設計になっており、Deno 2.2.4以降の環境でも安定して動作します。

### 主な特徴

- 自動WASI API対応（ProxyによるAPIエミュレーション）
- エラー時のフォールバック処理
- シンプルなHTTPインターフェース

## 注意点

- WASM実行環境に依存するため、互換性のあるDeno実行環境が必要です
- 本番環境にデプロイする前に、十分なテストを行ってください