/**
 * WebAssemblyモジュールをインスタンス化するためのヘルパー関数
 * @param wasmPath - WebAssemblyファイルのパス
 * @returns WebAssemblyモジュールのインスタンスとモジュール
 */
export async function instantiate(wasmPath: string): Promise<{
  instance: WebAssembly.Instance;
  module: WebAssembly.Module;
}> {
  const wasmModule = await fetchAndCompileWasm(wasmPath);
  const instance = await instantiateWasmModule(wasmModule);

  return {
    instance,
    module: wasmModule,
  };
}

/**
 * WebAssemblyファイルを取得してコンパイルする
 * @param wasmPath - WebAssemblyファイルのパス
 * @returns コンパイルされたWebAssemblyモジュール
 */
async function fetchAndCompileWasm(wasmPath: string): Promise<WebAssembly.Module> {
  try {
    const wasmBytes = await Deno.readFile(wasmPath);
    return await WebAssembly.compile(wasmBytes);
  } catch (error) {
    console.error(`WebAssemblyモジュールの読み込みに失敗しました: ${wasmPath}`, error);
    throw error;
  }
}

/**
 * WebAssemblyモジュールをインスタンス化する
 * @param wasmModule - コンパイルされたWebAssemblyモジュール
 * @returns WebAssemblyモジュールのインスタンス
 */
async function instantiateWasmModule(
  wasmModule: WebAssembly.Module
): Promise<WebAssembly.Instance> {
  // Deno 2.2.4以降ではwasi対応方法が変更されています
  // 直接インポートオブジェクトを作成
  const importObject = {
    wasi_snapshot_preview1: {
      // 必要最小限のWASI関数を実装
      proc_exit: () => {},
      fd_close: () => 0,
      fd_seek: () => 0,
      fd_write: () => 0,
      fd_read: () => 0,
      environ_sizes_get: () => 0,
      environ_get: () => 0,
      clock_time_get: () => 0,
      random_get: () => 0,
      sched_yield: () => 0, // エラーログで必要と示された関数

      // 以下はよく使われる関数も追加
      args_sizes_get: () => 0,
      args_get: () => 0,
      fd_fdstat_get: () => 0,
      fd_fdstat_set_flags: () => 0,
      fd_prestat_get: () => 0,
      fd_prestat_dir_name: () => 0,
      path_open: () => 0,
      path_filestat_get: () => 0,
    },
  };

  // WebAssemblyモジュールのインスタンス化
  return await WebAssembly.instantiate(wasmModule, importObject);
}
