import logging
from contextlib import asynccontextmanager

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.analytics import router as analytics_router
from routers.movies import router as movies_router
from routers.recommendations import router as recommendations_router
from services.embeddings import load_embeddings, setup_chroma
from services.preprocessing import DataFilter
from services.projection import load_projection

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the CSV dataset and pre-compute metadata cache on startup."""
    logger.info("Chargement du CSV...")
    raw_df = pd.read_csv("data/movies.csv", engine="python", on_bad_lines="skip")
    logger.info("%d films chargés (brut)", len(raw_df))
    app.state.df = DataFilter().apply(raw_df)
    logger.info("%d films après filtrage", len(app.state.df))

    app.state.meta_cache = {
        "genres": sorted(
            {g.strip() for raw in app.state.df["Genre"].dropna() for g in raw.split(",")}
        ),
        "languages": sorted(app.state.df["Original_Language"].dropna().unique().tolist()),
    }

    df = app.state.df
    embed_df = df[df["Overview"].notna() & (df["Overview"].str.strip() != "")]
    logger.info("%d films avec synopsis (embeddings)", len(embed_df))

    vectors = load_embeddings(embed_df["Overview"].tolist())
    app.state.embeddings = {int(mid): vec for mid, vec in zip(embed_df.index, vectors)}
    app.state.chroma_collection = setup_chroma(embed_df, vectors)
    app.state.projection = load_projection(app.state.df, app.state.embeddings)

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
app.include_router(recommendations_router)
app.include_router(analytics_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
