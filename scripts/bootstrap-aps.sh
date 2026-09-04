#!/usr/bin/env bash
# Fetches the Acceptance-Pipeline-Specification tools and builds the Go fallback
# binaries into ./bin. Babashka is not available in this environment.
set -euo pipefail

APS_REPO="${APS_REPO:-https://github.com/unclebob/Acceptance-Pipeline-Specification.git}"
APS_REF="${APS_REF:-main}"
GO_BIN="${GO_BIN:-/usr/local/go/bin/go}"

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bin_dir="$project_root/bin"
checkout_dir="$project_root/build/aps-source"
commands=(gherkin-parser gherkin-ir-dry-checker gherkin-mutator)

all_present() {
  for command_name in "${commands[@]}"; do
    [ -x "$bin_dir/$command_name" ] || return 1
  done
}

if all_present; then
  echo "aps: binaries already present in $bin_dir"
  exit 0
fi

if [ ! -x "$GO_BIN" ]; then
  echo "aps: no Go toolchain at $GO_BIN; set GO_BIN to override" >&2
  exit 1
fi

if [ -d "$checkout_dir/.git" ]; then
  git -C "$checkout_dir" fetch --depth 1 origin "$APS_REF"
  git -C "$checkout_dir" checkout --detach FETCH_HEAD
else
  mkdir -p "$(dirname "$checkout_dir")"
  rm -rf "$checkout_dir"
  git clone --depth 1 --branch "$APS_REF" "$APS_REPO" "$checkout_dir"
fi

mkdir -p "$bin_dir"
for command_name in "${commands[@]}"; do
  echo "aps: building $command_name"
  (cd "$checkout_dir" && "$GO_BIN" build -o "$bin_dir/$command_name" "./cmd/$command_name")
done

echo "aps: built ${commands[*]} into $bin_dir"
