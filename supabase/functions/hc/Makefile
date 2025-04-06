.PHONY: build build-js build-wasi clean

# 標準のGoJS WASMビルド
build:
	GOOS=js GOARCH=wasm go build -o health.wasm main.go

# WASIPモードでのビルド
build-wasi:
	GOOS=wasip1 GOARCH=wasm go build -o health_wasi.wasm main.go

# TinyGoでのビルド
build-tiny:
	tinygo build -o health_tiny.wasm -target wasm main.go

# シンプルなWASMビルド
build-simple:
	GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o health_simple.wasm main.go

# クリーンアップ
clean:
	rm -f *.wasm
