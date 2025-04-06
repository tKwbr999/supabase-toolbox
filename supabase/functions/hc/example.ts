import { HealthChecker } from './index.ts';

async function runHealthCheck() {
  console.log('ヘルスチェッカーを初期化しています...');

  const healthChecker = new HealthChecker();
  await healthChecker.initialize();

  console.log('ヘルスチェックを実行しています...');

  // ヘルスチェックを実行して結果を表示
  const healthInfo = healthChecker.checkHealth();
  console.log('結果:', JSON.stringify(healthInfo, null, 2));

  // 定期的なヘルスチェックのデモ
  console.log('\n5秒ごとにヘルスチェックを実行します（Ctrl+Cで停止）...');

  let count = 0;
  const interval = setInterval(() => {
    count++;
    const health = healthChecker.checkHealth();
    console.log(`[${count}] ${health.timestamp}: ${health.status}`);

    // デモのため10回で停止
    if (count >= 10) {
      clearInterval(interval);
      console.log('ヘルスチェックが完了しました。');
    }
  }, 5000);
}

// スクリプトを実行
runHealthCheck().catch(error => {
  console.error('エラーが発生しました:', error);
  Deno.exit(1);
});
