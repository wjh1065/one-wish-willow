# `python -m server`: a command line of its own, so restarting DOVI next door (`-m server.app`) never stops this one
import uvicorn

from . import config

uvicorn.run("server.app:app", host="127.0.0.1", port=config.PORT)
