import pandas as pd
from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter(prefix="/api/movies")


def _coerce(value, target_type):
    """Cast value to target_type, returning None for NaN or invalid values."""
    try:
        return target_type(value) if pd.notna(value) else None
    except (ValueError, TypeError):
        return None


_ADULT_KEYWORDS = frozenset(
    [
        "pornographic",
        "erotic film",
        "erotic movie",
        "adult film",
        "adult movie",
        "sexually explicit",
        "sex film",
        "hardcore",
        "softcore",
    ]
)


def _split_genres(raw_genre: str) -> list[str]:
    """Split a comma-separated genre string into a cleaned list."""
    return [] if pd.isna(raw_genre) else [g.strip() for g in str(raw_genre).split(",")]


def _is_adult(row: pd.Series) -> bool:
    """Return True if the film's overview or title contains explicit adult keywords."""
    text = " ".join([str(row.get("Overview") or ""), str(row.get("Title") or "")]).lower()
    return any(kw in text for kw in _ADULT_KEYWORDS)


def _serialize_movie(movie_id: int, row: pd.Series, genre_avg_map: dict = {}) -> dict:
    """Serialize a DataFrame row into a movie card (summary fields)."""
    genres = _split_genres(row["Genre"])
    return {
        "movie_id": movie_id,
        "title": _coerce(row["Title"], str),
        "poster_url": _coerce(row["Poster_Url"], str),
        "vote_average": _coerce(row["Vote_Average"], float),
        "genres": genres,
        "genre_avgs": {genre: genre_avg_map[genre] for genre in genres if genre in genre_avg_map},
        "release_year": str(row["Release_Date"])[:4] if pd.notna(row["Release_Date"]) else None,
        "adult": _is_adult(row),
    }


@router.get("/meta")
def get_filter_options(request: Request):
    """Return genres, languages, genre stats, language counts and year range for filters."""
    return {**request.app.state.meta_cache, "embeddings_ready": request.app.state.embeddings_ready}


@router.get("")
def list_movies(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    genre: str = Query(None),
    lang: str = Query(None),
    search: str = Query(None),
    year_min: int = Query(None),
    rating_min: float = Query(None, ge=0, le=10),
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
    if year_min:
        years = pd.to_datetime(df["Release_Date"], errors="coerce").dt.year
        match_all &= years >= year_min
    if rating_min is not None:
        match_all &= pd.to_numeric(df["Vote_Average"], errors="coerce") >= rating_min

    matching = df[match_all]
    total = len(matching)

    vote_averages = pd.to_numeric(matching["Vote_Average"], errors="coerce")
    avg_rating = (
        round(float(vote_averages.mean()), 2) if total > 0 and vote_averages.notna().any() else None
    )

    genre_avg_map = request.app.state.meta_cache["genre_avg_map"]
    page_slice = matching.iloc[(page - 1) * limit : page * limit]

    return {
        "total": total,
        "avg_rating": avg_rating,
        "page": page,
        "results": [
            _serialize_movie(int(movie_id), row, genre_avg_map)
            for movie_id, row in page_slice.iterrows()
        ],
    }


@router.get("/{movie_id}")
def get_movie(movie_id: int, request: Request):
    """Return full details for a single movie by its id."""
    df: pd.DataFrame = request.app.state.df
    if movie_id not in df.index:
        raise HTTPException(status_code=404, detail="Movie not found")
    row = df.loc[movie_id]
    genre_avg_map = request.app.state.meta_cache["genre_avg_map"]
    return {
        **_serialize_movie(movie_id, row, genre_avg_map),
        "overview": row["Overview"],
        "vote_count": _coerce(row["Vote_Count"], int),
        "popularity": _coerce(row["Popularity"], float),
        "original_language": _coerce(row["Original_Language"], str),
        "release_date": _coerce(row["Release_Date"], str),
    }
