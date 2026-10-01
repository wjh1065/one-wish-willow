"""One Wish Willow server: only the static page. The wish never leaves the browser.

Run:  uv run python -m server   (not -m server.app, so it is told apart from DOVI)
"""

import uvicorn
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

from . import config

app = FastAPI(title="One Wish Willow", docs_url=None, redoc_url=None, openapi_url=None)


# The page changes often: browsers check for a newer file every time (cheap, via Last-Modified)
@app.middleware("http")
async def no_cache(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache"
    return response


app.mount("/", StaticFiles(directory=config.WEB_DIR, html=True), name="web")

if __name__ == "__main__":
    uvicorn.run("server.app:app", host="127.0.0.1", port=config.PORT)
