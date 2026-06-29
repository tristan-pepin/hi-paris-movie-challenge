import logging
from contextlib import asynccontextmanager

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.movies import router as movies_router

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the CSV dataset and pre-compute metadata cache on startup."""
    logger.info("Chargement du CSV...")
    app.state.df = pd.read_csv("data/movies.csv", engine="python", on_bad_lines="skip")
    logger.info("%d films chargés", len(app.state.df))

    app.state.meta_cache = {
        "genres": sorted(
            {g.strip() for raw in app.state.df["Genre"].dropna() for g in raw.split(",")}
        ),
        "languages": sorted(app.state.df["Original_Language"].dropna().unique().tolist()),
    }
    yield


app = FastAPI(title="Movie Explorer API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(movies_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
