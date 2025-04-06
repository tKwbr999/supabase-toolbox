/**
 * Supabase Edge Function用 WASMハンドラー
 * Go WASMモジュールを実行
 */

/**
 * WASMファイルをロードし、自動的にWASI APIおよびGoJS APIを提供
 */
export async function loadWasmWithAutoWasi(wasmPath: string): Promise<WebAssembly.Instance> {
  console.log("ロードするWASMファイル:", wasmPath);
  try {
    const wasmBytes = await Deno.readFile(wasmPath);
    const module = await WebAssembly.compile(wasmBytes);
    
    // モジュールのインポート情報を取得
    const imports = WebAssembly.Module.imports(module);
    console.log("インポート情報:", imports);
    
    // WASI関数を自動生成するProxyオブジェクト
    const wasiHandler = {
      get: (_target: any, prop: string) => {
        // デバッグが必要な場合はコメントを外す
        // console.debug(`WASI関数呼び出し: ${prop}`);
        
        // 基本的な関数を優先して提供
        if (prop === "proc_exit") {
          return () => { /* 何もしない */ };
        }
        
        if (prop === "fd_write" || prop === "fd_read") {
          return () => 0; // 成功を表す0を返す
        }
        
        // その他すべての関数に対してダミー実装を返す
        return () => 0;
      }
    };
    
    // GoJS関数を自動生成するProxyオブジェクト
    const gojsHandler = {
      get: (_target: any, prop: string) => {
        // Goランタイム関数をダミー実装
        return (...args: any[]) => {
          // console.log(`GoJS関数呼び出し: ${prop}`, args);
          return 0;
        };
      }
    };
    
    // インポートオブジェクトを作成
    const importObject: WebAssembly.Imports = {};
    
    // 必要なインポートモジュールを登録
    const requiredModules = new Set(imports.map(imp => imp.module));
    for (const moduleName of requiredModules) {
      if (moduleName === "wasi_snapshot_preview1") {
        importObject[moduleName] = new Proxy({}, wasiHandler);
      } else if (moduleName === "gojs") {
        importObject[moduleName] = new Proxy({}, gojsHandler);
      } else {
        importObject[moduleName] = {};
      }
    }
    
    // インスタンス化
    return await WebAssembly.instantiate(module, importObject);
  } catch (error) {
    console.error("WASMモジュール読み込みエラー:", error);
    throw error;
  }
}

/**
 * テキストからUint8Arrayへの変換
 */
export function textToUint8Array(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Uint8Arrayからテキストへの変換
 */
export function uint8ArrayToText(array: Uint8Array): string {
  return new TextDecoder().decode(array);
}

/**
 * 簡易健康チェッカー
 * 外部依存がないシンプルな実装
 */
export class SimpleHealthChecker {
  /**
   * ヘルスチェック実行
   */
  checkHealth(): Record<string, any> {
    // 組み込みのヘルスチェック情報を生成
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0-fallback",
      source: "native-ts-implementation"
    };
  }
}

/**
 * 自動WASI対応のヘルスチェッカークラス
 */
export class AutoWasiHealthChecker {
  private instance: WebAssembly.Instance | null = null;
  private initialized: boolean = false;
  private getBufferPtrFn: string = ''; // 見つかったget_buffer_ptr関数名
  private healthCheckFn: string = ''; // 見つかったhealth_check関数名
  private fallbackChecker = new SimpleHealthChecker();
  
  /**
   * 初期化
   * @param wasmPath WASMファイルのパス
   */
  async initialize(wasmPath: string): Promise<void> {
    try {
      this.instance = await loadWasmWithAutoWasi(wasmPath);
      console.log("ヘルスチェックWASMモジュールが初期化されました");
      
      // モジュールが正しく初期化されたか確認
      const exports = this.instance.exports;
      console.log("利用可能なエクスポート:", Object.keys(exports));
      
      // エクスポート関数を探す
      this.findExportedFunctions(exports);
      
      // 初期化フラグを設定
      this.initialized = true;
    } catch (error) {
      console.error("WASMモジュール初期化エラー:", error);
      this.initialized = false;
      throw error;
    }
  }
  
  /**
   * エクスポートされた関数を探す
   */
  private findExportedFunctions(exports: WebAssembly.Exports): void {
    if (!exports.memory) {
      console.warn("メモリエクスポートが見つかりません - フォールバックを使用します");
      return;
    }
    
    // 全てのエクスポート関数をログ出力
    console.log("全エクスポート:", Object.keys(exports).map(key => {
      const type = typeof exports[key];
      return `${key} (${type})`;
    }));
    
    // 必要な関数を探す
    const foundFunctions: Record<string, string> = {};
    
    // get_buffer_ptr関数を探す
    for (const key of Object.keys(exports)) {
      if (typeof exports[key] === 'function') {
        if (key.toLowerCase().includes('buffer') || key.toLowerCase().includes('get_buffer')) {
          foundFunctions.bufferFn = key;
        } else if (key.toLowerCase().includes('health') || key.toLowerCase().includes('check')) {
          foundFunctions.healthFn = key;
        }
      }
    }
    
    console.log("見つかった関数:", foundFunctions);
    
    // 見つかった関数を設定
    if (foundFunctions.bufferFn) {
      this.getBufferPtrFn = foundFunctions.bufferFn;
    }
    
    if (foundFunctions.healthFn) {
      this.healthCheckFn = foundFunctions.healthFn;
    }
  }
  
  /**
   * ヘルスチェック実行
   * @returns ヘルスチェック情報
   */
  checkHealth(): Record<string, any> {
    // WASMが利用可能か確認
    if (!this.initialized || !this.instance) {
      console.warn("WASMモジュールが初期化されていないため、フォールバック実装を使用します");
      return this.fallbackChecker.checkHealth();
    }
    
    // 必要な関数が見つかっているか確認
    if (!this.getBufferPtrFn || !this.healthCheckFn) {
      console.warn("必要な関数が見つからないため、フォールバック実装を使用します");
      return this.fallbackChecker.checkHealth();
    }
    
    try {
      const exports = this.instance.exports;
      const memory = exports.memory as WebAssembly.Memory;
      
      // バッファポインタ取得関数を実行
      const getBufferPtr = exports[this.getBufferPtrFn] as CallableFunction;
      const bufferPtr = getBufferPtr();
      
      // ヘルスチェック実行
      const healthCheck = exports[this.healthCheckFn] as CallableFunction;
      const length = healthCheck();
      
      if (length <= 0) {
        throw new Error(`ヘルスチェックエラー: ${length}`);
      }
      
      // メモリから結果を読み取る
      const buffer = new Uint8Array(memory.buffer, bufferPtr, length);
      const jsonStr = uint8ArrayToText(buffer.slice(0, length));
      
      try {
        return JSON.parse(jsonStr);
      } catch (jsonError) {
        console.error("JSONパースエラー:", jsonStr);
        throw new Error("ヘルスチェック結果のパースに失敗");
      }
    } catch (error) {
      console.error("ヘルスチェック実行エラー:", error);
      
      // エラー時のフォールバック
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        source: "error-fallback"
      };
    }
  }
}