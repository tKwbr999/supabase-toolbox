// Supabase Edge Function - ヘルスチェックモジュール
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { SimpleHealthChecker, AutoWasiHealthChecker } from "./wasm_handler.ts";

// 環境変数設定（必要に応じて）
const ENV_PREFIX = Deno.env.get("ENV_PREFIX") || "";
const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache, no-store, must-revalidate",
};

// ヘルスチェッカーのインスタンスを作成
const healthChecker = new AutoWasiHealthChecker();
// 初期化を試みる - 失敗してもサービスは継続
await healthChecker.initialize("./health.wasm").catch(error => {
  console.error("WASMヘルスチェッカーの初期化に失敗:", error);
  console.log("フォールバック実装を使用します");
});

// メインのハンドラー関数
serve(async (req) => {
  try {
    // リクエストパスとメソッドの確認
    const url = new URL(req.url);
    const path = url.pathname;
    
    // /health エンドポイントの処理
    if (path === "/health" || path === "/hc/health") {
      // ヘルスチェック実行
      const healthData = healthChecker.checkHealth();
      
      // サービス固有の情報を追加
      const enhancedData = {
        ...healthData,
        service: `${ENV_PREFIX}health-checker`,
        requestId: crypto.randomUUID(),
        endpoint: path,
      };
      
      return new Response(
        JSON.stringify(enhancedData),
        {
          status: 200,
          headers: DEFAULT_HEADERS,
        }
      );
    }
    
    // その他のパスは404を返す
    return new Response(
      JSON.stringify({ error: "Not found" }),
      {
        status: 404,
        headers: DEFAULT_HEADERS,
      }
    );
    
  } catch (error) {
    // エラーハンドリング
    console.error("リクエスト処理中にエラーが発生:", error);
    
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Internal server error",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: DEFAULT_HEADERS,
      }
    );
  }
});