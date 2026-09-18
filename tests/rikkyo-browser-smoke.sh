#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="\${RIKKYO_TEST_PORT:-8766}"
TMP="$(mktemp -d)"
cleanup(){ if [[ -n "\${SERVER_PID:-}" ]]; then kill "$SERVER_PID" 2>/dev/null || true; fi; rm -rf "$TMP"; }
trap cleanup EXIT
cd "$ROOT"
python3 -m http.server "$PORT" --bind 127.0.0.1 >"$TMP/server.log" 2>&1 &
SERVER_PID=$!
for _ in {1..30}; do curl -fsS "http://127.0.0.1:$PORT/tests/rikkyo-browser-smoke.html" >/dev/null && break; sleep .2; done
CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
[[ -n "$CHROME" ]] || { echo "Chrome/Chromium not available" >&2; exit 1; }
for scenario in fresh attempt drill resume holdout; do
  DOM="$TMP/$scenario.html"
  "$CHROME" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --user-data-dir="$TMP/profile-$scenario" --virtual-time-budget=8000 --dump-dom "http://127.0.0.1:$PORT/tests/rikkyo-browser-smoke.html?case=$scenario" >"$DOM" 2>"$TMP/$scenario.log"
  grep -q 'data-test-result="CLEAN"' "$DOM" || { echo "Rikkyo browser smoke failed: $scenario" >&2; grep -o 'Rikkyo browser smoke: FAIL:[^<]*' "$DOM" >&2 || true; cat "$TMP/$scenario.log" >&2; exit 1; }
  echo "Rikkyo browser smoke $scenario: CLEAN"
done
echo "Rikkyo real-browser MVP: CLEAN"
