#!/usr/bin/env bash
# shots.sh — refaz as imagens do README a partir de tools/shots.html.
#
# Chrome headless em 2× (tela de retina): a foto sai nítida no GitHub e no
# celular. Cada linha de SHOTS é uma foto: <arquivo>|<hash>|<largura>|<altura>,
# em px de CSS (o dobro sai no arquivo). Mexeu nas variações de
# tools/bench-stubs.js? Confira na bancada e ajuste as medidas aqui.
#
# Uso:  tools/shots.sh            # todas
#       tools/shots.sh clone      # só a que casar com o nome do arquivo
#
# ARMADILHA: perfil do Chrome compartilhado entre as fotos **trava** a segunda
# execução (o singleton lock da primeira ainda está lá e o Chrome fica
# esperando para sempre, sem erro). Perfil novo por foto + vigia por tempo.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Chrome não encontrado em $CHROME" >&2; exit 1; }
mkdir -p docs

SHOTS=(
  "clone|clone|482|496"
  "posicoes|bottom,top,left,right|1362|340"
  "variacoes|meio,plano|678|330"
)

FILTER="${1:-}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for spec in "${SHOTS[@]}"; do
  IFS='|' read -r name hash w h <<< "$spec"
  [ -z "$FILTER" ] || [ "$FILTER" = "$name" ] || continue
  out="docs/$name.png"
  rm -f "$out"
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 \
    --window-size="$w,$h" \
    --user-data-dir="$TMP/$name" \
    --no-first-run --no-default-browser-check \
    --disable-extensions --disable-background-networking \
    --disable-component-update --disable-sync \
    --virtual-time-budget=2500 \
    --screenshot="$out" \
    "file://$PWD/tools/shots.html#$hash" >/dev/null 2>&1 &
  pid=$!
  for _ in $(seq 1 60); do [ -s "$out" ] && break; sleep 0.5; done
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  [ -s "$out" ] || { echo "✗ $out saiu vazio" >&2; exit 1; }
  echo "✓ $out  ($(du -h "$out" | cut -f1))"
done
