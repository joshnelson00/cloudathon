#!/usr/bin/env bash
# Builds the reportlab Lambda layer zip for Python 3.12 / linux x86_64.
# Run from the infra/lambda/ directory.
set -euo pipefail

LAYER_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="${LAYER_DIR}/.layer_build"
OUTPUT="${LAYER_DIR}/reportlab_layer.zip"

rm -rf "$BUILD_DIR" "$OUTPUT"
mkdir -p "$BUILD_DIR/python"

pip install \
  --platform manylinux2014_x86_64 \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all: \
  --target "$BUILD_DIR/python" \
  reportlab

cd "$BUILD_DIR"
python3 -c "
import zipfile, os
with zipfile.ZipFile('$OUTPUT', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('python'):
        for f in files:
            fp = os.path.join(root, f)
            zf.write(fp)
"
cd "$LAYER_DIR"
rm -rf "$BUILD_DIR"

echo "Layer zip created: $OUTPUT"
