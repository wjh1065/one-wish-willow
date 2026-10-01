#!/usr/bin/env bash
# One Wish Willow: http://localhost:8767
cd "$(dirname "$0")"
exec uv run python -m server
