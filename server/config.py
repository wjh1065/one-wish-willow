import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Not PORT: a shell that runs DOVI next door may already export that one
PORT = int(os.environ.get("WILLOW_PORT", "8767"))

WEB_DIR = ROOT / "web"
