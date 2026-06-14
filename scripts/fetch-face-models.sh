#!/usr/bin/env bash
# Скачивает веса моделей face-api.js и саму библиотеку в public/ для self-hosting.
# Запускать при обновлении версии face-api. Файлы коммитятся в репозиторий
# (< 1 МБ) — рантайм НЕ зависит от внешнего CDN (медпродукт, оффлайн-устойчивость,
# отсутствие supply-chain риска и CSP-блокировки connect-src).
#
# Использование: bash scripts/fetch-face-models.sh
set -euo pipefail

VERSION="0.22.2"
BASE="https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@${VERSION}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODELS_DIR="${ROOT}/public/models"
VENDOR_DIR="${ROOT}/public/vendor"

mkdir -p "${MODELS_DIR}" "${VENDOR_DIR}"

# Только используемые сети: tinyFaceDetector + faceLandmark68Net + faceExpressionNet.
MODELS=(
  "tiny_face_detector_model-weights_manifest.json"
  "tiny_face_detector_model-shard1"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model-shard1"
  "face_expression_model-weights_manifest.json"
  "face_expression_model-shard1"
)

echo "Веса моделей → ${MODELS_DIR}"
for f in "${MODELS[@]}"; do
  curl -fsSL -o "${MODELS_DIR}/${f}" "${BASE}/weights/${f}"
  echo "  ✓ ${f}"
done

echo "Библиотека → ${VENDOR_DIR}/face-api.min.js"
curl -fsSL -o "${VENDOR_DIR}/face-api.min.js" "${BASE}/dist/face-api.min.js"
echo "  ✓ face-api.min.js (v${VERSION})"

echo "Готово."
