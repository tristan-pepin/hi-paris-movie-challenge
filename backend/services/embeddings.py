from pathlib import Path

import chromadb
import numpy as np
import pandas as pd
from openai import OpenAI

EMBEDDINGS_CACHE = Path("cache/embeddings.npy")
CHROMA_PATH = Path("cache/chroma")
BATCH_SIZE = 100


def _compute_from_api(overviews: list[str]) -> np.ndarray:
    """Call OpenAI Embeddings API in batches, return stacked numpy array."""
    client = OpenAI()
    vectors = []
    for i in range(0, len(overviews), BATCH_SIZE):
        batch = overviews[i : i + BATCH_SIZE]
        response = client.embeddings.create(model="text-embedding-3-small", input=batch)
        vectors.extend([e.embedding for e in response.data])
    return np.array(vectors, dtype=np.float32)


def load_embeddings(overviews: list[str]) -> np.ndarray:
    """Load embeddings from cache, or compute and cache via OpenAI if missing."""
    if EMBEDDINGS_CACHE.exists():
        cached = np.load(EMBEDDINGS_CACHE)
        if len(cached) == len(overviews):
            return cached
    embeddings = _compute_from_api(overviews)
    np.save(EMBEDDINGS_CACHE, embeddings)
    return embeddings


def setup_chroma(df: pd.DataFrame, embeddings: np.ndarray) -> chromadb.Collection:
    """Return ChromaDB collection; upserts all movies only if not already indexed."""
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    collection = client.get_or_create_collection("movies", metadata={"hnsw:space": "cosine"})
    if collection.count() == len(df):
        return collection
    ids = [str(i) for i in df.index]
    vecs = embeddings.tolist()
    metas = [{"title": str(row["Title"])} for _, row in df.iterrows()]
    for i in range(0, len(ids), BATCH_SIZE):
        collection.upsert(
            ids=ids[i : i + BATCH_SIZE],
            embeddings=vecs[i : i + BATCH_SIZE],
            metadatas=metas[i : i + BATCH_SIZE],
        )
    return collection
