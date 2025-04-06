//go:build js && wasm

package main

import (
	"encoding/json"
	"syscall/js"
	"time"
)

// ヘルスチェック情報を生成するメイン関数
func getHealthInfo() map[string]interface{} {
	return map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   "1.0.5",
		"source":    "go-wasm",
	}
}

// JSONとしてヘルスチェック情報を取得
func getHealthInfoJSON() string {
	info := getHealthInfo()
	data, err := json.Marshal(info)
	if err != nil {
		return `{"status":"error", "message":"json marshal error"}`
	}
	return string(data)
}

// JavaScriptにエクスポートするヘルスチェック関数
func healthCheck(this js.Value, args []js.Value) interface{} {
	return getHealthInfoJSON()
}

// JavaScriptからJSONオブジェクトを返す関数
func getHealthObject(this js.Value, args []js.Value) interface{} {
	info := getHealthInfo()
	
	// JSのオブジェクトを作成
	result := js.Global().Get("Object").New()
	
	// 各フィールドを設定
	for key, value := range info {
		switch v := value.(type) {
		case string:
			result.Set(key, v)
		case float64:
			result.Set(key, v)
		case int:
			result.Set(key, v)
		case bool:
			result.Set(key, v)
		default:
			result.Set(key, js.Undefined())
		}
	}
	
	return result
}

func main() {
	// グローバルなJavaScript関数として登録
	js.Global().Set("getHealthCheck", js.FuncOf(healthCheck))
	js.Global().Set("getHealthObject", js.FuncOf(getHealthObject))
	
	// プログラムが終了しないようにする
	<-make(chan bool)
}
