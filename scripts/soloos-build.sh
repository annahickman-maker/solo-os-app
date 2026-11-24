#!/bin/sh
# Builds Solo OS on a Mac: the same build as scripts/soloos-build.mjs, which
# it runs with this repository's pinned Node (bin/node). Arguments are passed
# on to `tauri build`.
set -eu
cd "$(dirname "$0")/.."
exec bin/node scripts/soloos-build.mjs "$@"
