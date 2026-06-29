import pandas as pd
from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(prefix="/api")


class RecommendationRequest(BaseModel):
    movie_id: int
    k: int = 6


def _to_recommendation(movie_id: int, row: pd.Series, distance: float) -> dict:
    """Serialize a DataFrame row as a recommendation with its similarity score."""
    genres = [g.strip() for g in str(row["Genre"]).split(",")] if pd.notna(row["Genre"]) else []
    return {
        "movie_id": movie_id,
        "title": row["Title"],
        "poster_url": row["Poster_Url"],
        "vote_average": float(row["Vote_Average"]) if pd.notna(row["Vote_Average"]) else None,
        "genres": genres,
        "release_year": str(row["Release_Date"])[:4] if pd.notna(row["Release_Date"]) else None,
        "similarity_score": round(max(0.0, 1 - distance), 4),
    }


@router.post("/recommendations")
def recommend(body: RecommendationRequest, request: Request):
    """Return k movies most similar to the given movie_id."""
    embeddings = request.app.state.embeddings
    if body.movie_id not in embeddings:
        return []
    df: pd.DataFrame = request.app.state.df
    results = request.app.state.chroma_collection.query(
        query_embeddings=[embeddings[body.movie_id].tolist()],
        n_results=body.k + 1,
    )
    return [
        _to_recommendation(int(mid), df.loc[int(mid)], dist)
        for mid, dist in zip(results["ids"][0], results["distances"][0])
        if int(mid) != body.movie_id and int(mid) in df.index
    ][: body.k]
