import logging
import os
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

    df = app.state.df
    df["_vote"] = pd.to_numeric(df["Vote_Average"], errors="coerce")

    genre_df = (
        df.assign(_genre=df["Genre"].str.split(",")).explode("_genre").dropna(subset=["_genre"])
    )
    genre_df = genre_df[genre_df["_genre"].str.strip() != ""]
    genre_df["_genre"] = genre_df["_genre"].str.strip()

    genre_stats = {
        genre: {
            "count": len(group),
            "avg_rating": round(float(group["_vote"].mean()), 2)
            if group["_vote"].notna().any()
            else None,
        }
        for genre, group in genre_df.groupby("_genre")
    }

    years = pd.to_datetime(df["Release_Date"], errors="coerce").dt.year.dropna()

    app.state.meta_cache = {
        "genres": sorted(genre_stats),
        "languages": sorted(df["Original_Language"].dropna().unique().tolist()),
        "genre_stats": genre_stats,
        "language_counts": {
            lang: int(count) for lang, count in df["Original_Language"].value_counts().items()
        },
        "year_range": {"min": int(years.min()), "max": int(years.max())},
        "genre_avg_map": {genre: stats["avg_rating"] for genre, stats in genre_stats.items()},
    }

    df.drop(columns=["_vote"], inplace=True)

    if os.getenv("OPENAI_API_KEY"):
        df = app.state.df
        embed_df = df[df["Overview"].notna() & (df["Overview"].str.strip() != "")]
        logger.info("%d films avec synopsis (embeddings)", len(embed_df))
        vectors = load_embeddings(embed_df["Overview"].tolist())
        app.state.embeddings = {
            int(movie_id): vector for movie_id, vector in zip(embed_df.index, vectors)
        }
        app.state.chroma_collection = setup_chroma(embed_df, vectors)
        app.state.projection = load_projection(app.state.df, app.state.embeddings)
        app.state.embeddings_ready = True
    else:
        logger.warning("OPENAI_API_KEY not set — embeddings, recommendations and map disabled.")
        app.state.embeddings = {}
        app.state.chroma_collection = None
        app.state.projection = []
        app.state.embeddings_ready = False

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
