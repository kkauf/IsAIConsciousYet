#!/bin/sh
# Loads API keys into the environment without printing them, then runs one seed
# (or another pipeline script: run.sh rule-preview.mjs).
# In CI the same variables come from Actions secrets and this loop finds no files.
# Needs: PARALLEL_API_KEY, GEMINI_API_KEY, TYPESAFE_API_KEY.
set -eu
for f in "$HOME/.claude/secrets/parallel.env" "$HOME/.claude/secrets/google.env"; do
  if [ -f "$f" ]; then set -a; . "$f"; set +a; fi
done
case "${1:-}" in
  *.mjs) script="$1"; shift ;;
  *) script="run-case.mjs" ;;
esac
exec node "$(dirname "$0")/$script" "$@"
