/**
 * ヘルスチェック機能のテスト
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.210.0/testing/asserts.ts";
import { SimpleHealthChecker, AutoWasiHealthChecker } from "./wasm_handler.ts";

// 現在のディレクトリを確認
const currentDir = Deno.cwd();
console.log("現在のディレクトリ:", currentDir);

// フォールバック健康チェッカーのテスト
Deno.test("Simple Health Checker", () => {
  const healthChecker = new SimpleHealthChecker();
  
  // ヘルスチェック実行
  const healthInfo = healthChecker.checkHealth();
  
  // 必要なフィールドが存在することを確認
  assertExists(healthInfo.status);
  assertExists(healthInfo.timestamp);
  assertExists(healthInfo.version);
  
  // ステータスが期待通りであることを確認
  assertEquals(healthInfo.status, "healthy");
  
  // タイムスタンプが適切な形式であることを確認
  const timestamp = new Date(healthInfo.timestamp);
  assertEquals(isNaN(timestamp.getTime()), false);
  
  console.log("フォールバックヘルスチェック結果:", healthInfo);
});

// WASM対応ヘルスチェッカーのテスト（エラーハンドリングを強化）
Deno.test("Auto WASI Health Checker With Fallback", async () => {
  const healthChecker = new AutoWasiHealthChecker();
  
  try {
    // WASMモジュールの初期化を試みる
    await healthChecker.initialize(`${currentDir}/health.wasm`);
    console.log("WASMモジュールが初期化されました");
  } catch (error) {
    console.log("WASMモジュール初期化に失敗しましたが、テストは続行します");
  }
  
  // いずれにしても、ヘルスチェックは実行可能なはず
  const healthInfo = healthChecker.checkHealth();
  
  // 何らかの結果が返されることを確認
  assertExists(healthInfo);
  assertExists(healthInfo.status);
  assertExists(healthInfo.timestamp);
  
  console.log("ヘルスチェック結果:", healthInfo);
});