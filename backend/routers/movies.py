import pandas as pd
from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter(prefix="/api/movies")


def _coerce(value, target_type):
    """Cast value to target_type, returning None for NaN or invalid values."""
    try:
        return target_type(value) if pd.notna(value) else None
    except (ValueError, TypeError):
        return None


def _split_genres(raw_genre: str) -> list[str]:
    """Split a comma-separated genre string into a cleaned list."""
    return [] if pd.isna(raw_genre) else [g.strip() for g in str(raw_genre).split(",")]


def _serialize_movie(movie_id: int, row: pd.Series) -> dict:
    """Serialize a DataFrame row into a movie card (summary fields)."""
    return {
        "movie_id": movie_id,
        "title": row["Title"],
        "poster_url": row["Poster_Url"],
        "vote_average": _coerce(row["Vote_Average"], float),
        "genres": _split_genres(row["Genre"]),
        "release_year": str(row["Release_Date"])[:4] if pd.notna(row["Release_Date"]) else None,
    }


@router.get("/meta")
def get_filter_options(request: Request):
    """Return available genres and languages for filter dropdowns."""
    return request.app.state.meta_cache


@router.get("")
def list_movies(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    genre: str = Query(None),
    lang: str = Query(None),
    search: str = Query(None),
):
    """Return a paginated list of movies with optional filters."""
    df: pd.DataFrame = request.app.state.df

    match_all = pd.Series(True, index=df.index)
    if search:
        match_all &= df["Title"].str.contains(search, case=False, na=False)
    if lang:
        match_all &= df["Original_Language"] == lang
    if genre:
        match_all &= df["Genre"].str.contains(genre, case=False, na=False)

    matching_movies = df[match_all]
    total = len(matching_movies)
    page_slice = matching_movies.iloc[(page - 1) * limit : page * limit]

    return {
        "total": total,
        "page": page,
        "results": [
            _serialize_movie(int(movie_id), row) for movie_id, row in page_slice.iterrows()
        ],
    }


@router.get("/{movie_id}")
def get_movie(movie_id: int, request: Request):
    """Return full details for a single movie by its id."""
    df: pd.DataFrame = request.app.state.df
    if movie_id not in df.index:
        raise HTTPException(status_code=404, detail="Film introuvable")
    row = df.loc[movie_id]
    return {
        **_serialize_movie(movie_id, row),
        "overview": row["Overview"],
        "vote_count": _coerce(row["Vote_Count"], int),
        "popularity": _coerce(row["Popularity"], float),
        "original_language": row["Original_Language"],
        "release_date": row["Release_Date"],
    }
