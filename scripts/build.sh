#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist

go run ./tools/bundle web dist/planer.html

targets=(
  "windows amd64 windows-amd64 .exe"
  "windows arm64 windows-arm64 .exe"
  "linux amd64 linux-amd64 "
  "linux arm64 linux-arm64 "
  "darwin amd64 macos-amd64 "
  "darwin arm64 macos-arm64 "
)

for t in "${targets[@]}"; do
  read -r goos goarch label ext <<<"$t"
  stage="$(mktemp -d)"
  CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" go build -trimpath -ldflags "-s -w" -o "$stage/planer$ext" .
  if [ "$goos" = "windows" ]; then
    mv "$stage/planer$ext" "dist/planer-$label$ext"
  else
    tar -C "$stage" -czf "dist/planer-$label.tar.gz" planer
  fi
  rm -rf "$stage"
done

( cd dist && sha256sum * > SHA256SUMS.txt )
ls -la dist
