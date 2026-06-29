import json
from pathlib import Path

import numpy as np
import pandas as pd
from evoc.graph_construction import neighbor_graph_matrix
from evoc.knn_graph import knn_graph
from evoc.node_embedding import node_embedding

PROJECTION_CACHE = Path("cache/projection.json")
N_NEIGHBORS = 15
N_EPOCHS = 50


def _compute_projection(embeddings: np.ndarray) -> np.ndarray:
    """Reduce embeddings to 2D using EVoC's internal node embedding algorithm."""
    rng = np.random.RandomState(42)
    nn_inds, nn_dists = knn_graph(embeddings, n_neighbors=N_NEIGHBORS, random_state=rng)
    graph = neighbor_graph_matrix(N_NEIGHBORS, nn_inds, nn_dists, symmetrize=True)
    return node_embedding(
        graph,
        n_components=2,
        n_epochs=N_EPOCHS,
        random_state=rng,
        noise_level=0.5,
    )


def load_projection(df: pd.DataFrame, embeddings: dict[int, np.ndarray]) -> list[dict]:
    """Load 2D projection from cache, or compute and cache if missing."""
    if PROJECTION_CACHE.exists():
        with PROJECTION_CACHE.open() as f:
            cached = json.load(f)
        if len(cached) == len(embeddings):
            return cached

    movie_ids = list(embeddings.keys())
    matrix = np.stack([embeddings[movie_id] for movie_id in movie_ids])
    coords = _compute_projection(matrix)

    def _primary_genre(row: pd.Series) -> str:
        raw = row.get("Genre")
        if pd.isna(raw):
            return "Autre"
        parts = str(raw).split(",")
        return parts[0].strip() if parts else "Autre"

    points = []
    for movie_id, (x, y) in zip(movie_ids, coords):
        row = df.loc[movie_id]
        points.append(
            {
                "movie_id": movie_id,
                "title": str(row["Title"]),
                "x": round(float(x), 4),
                "y": round(float(y), 4),
                "genre": _primary_genre(row),
                "vote_average": float(row["Vote_Average"])
                if pd.notna(row["Vote_Average"])
                else None,
                "release_year": str(row["Release_Date"])[:4]
                if pd.notna(row["Release_Date"])
                else None,
                "poster_url": str(row["Poster_Url"]) if pd.notna(row["Poster_Url"]) else None,
            }
        )

    PROJECTION_CACHE.parent.mkdir(exist_ok=True)
    with PROJECTION_CACHE.open("w") as f:
        json.dump(points, f)

    return points
