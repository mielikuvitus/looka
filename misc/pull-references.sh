#!/usr/bin/env bash
#
# Clone (or update) the external reference repos listed in refs.json into
# misc/reference/external/. That folder is gitignored — these repos are
# read-only inspiration, not part of the Looka build.
#
# Usage: pnpm refs:pull   (or: bash misc/pull-references.sh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFS_JSON="$SCRIPT_DIR/reference/refs.json"
EXTERNAL_DIR="$SCRIPT_DIR/reference/external"

if ! command -v git >/dev/null 2>&1; then
  echo "error: git is not installed." >&2
  exit 1
fi

if [ ! -f "$REFS_JSON" ]; then
  echo "error: $REFS_JSON not found." >&2
  exit 1
fi

mkdir -p "$EXTERNAL_DIR"

# Extract "name<TAB>url" pairs from refs.json. Prefer jq; fall back to a small
# node one-liner (node is always available in this project).
read_repos() {
  if command -v jq >/dev/null 2>&1; then
    jq -r '.repos[] | "\(.name)\t\(.url)"' "$REFS_JSON"
  else
    node -e '
      const r = require(process.argv[1]);
      for (const x of r.repos) console.log(x.name + "\t" + x.url);
    ' "$REFS_JSON"
  fi
}

while IFS=$'\t' read -r name url; do
  [ -z "$name" ] && continue
  dest="$EXTERNAL_DIR/$name"
  if [ -d "$dest/.git" ]; then
    echo "==> updating $name"
    git -C "$dest" pull --ff-only || echo "    (skipped: could not fast-forward $name)"
  else
    echo "==> cloning $name"
    git clone --depth 1 "$url" "$dest"
  fi
done < <(read_repos)

echo "done. references are in: $EXTERNAL_DIR"
