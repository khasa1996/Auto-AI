#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"

cd "${ROOT_DIR}"

if [[ ! -f "${FRONTEND_DIR}/package.json" ]]; then
  echo "ERROR: frontend/package.json not found."
  echo "Extract the Auto-AI project and run this script from its root."
  exit 1
fi

if [[ -f "${HOME}/.Trash/Auto-AI-main/frontend/package.json" && ! -f "${HOME}/Auto-AI-main/frontend/package.json" ]]; then
  echo "INFO: A copy of Auto-AI was detected in Trash, but this script will NOT modify Trash."
fi

echo "== Auto-AI frontend location =="
echo "${FRONTEND_DIR}"

echo "== Node/npm =="
node --version
npm --version

echo "== npm registry =="
npm config get registry

expected_registry="https://registry.npmjs.org/"
actual_registry="$(npm config get registry)"
if [[ "${actual_registry}" != "${expected_registry}" ]]; then
  echo "ERROR: unexpected npm registry: ${actual_registry}"
  exit 1
fi

cd "${FRONTEND_DIR}"

echo "== Installing frontend dependencies =="
npm install

echo "== Lint =="
npm run lint

echo "== Production build =="
npm run build

echo "== Tests =="
npm test -- --watchAll=false

echo "== Security audit =="
npm audit --audit-level=high

if [[ ! -f package-lock.json ]]; then
  echo "ERROR: npm install did not create frontend/package-lock.json"
  exit 1
fi

echo "== Lockfile =="
npm ci --ignore-scripts

echo "== Final production build after npm ci =="
npm run build

echo "========================================"
echo "AUTO-AI FRONTEND QA PASSED"
echo "========================================"
