import logging

import pandas as pd

logger = logging.getLogger(__name__)

_RULES: list[tuple[str, callable]] = [
    ("Titre manquant", lambda df: df["Title"].notna()),
    ("Poster_Url manquante", lambda df: df["Poster_Url"].notna()),
    (
        "URL dans Original_Language",
        lambda df: ~df["Original_Language"].str.startswith("http", na=False),
    ),
    (
        "Code langue > 3 chars",
        lambda df: df["Original_Language"].str.len().le(3) | df["Original_Language"].isna(),
    ),
    ("Overview purement numérique", lambda df: ~df["Overview"].str.match(r"^\d+\.?\d*$", na=False)),
    ("Vote_Count = 0", lambda df: pd.to_numeric(df["Vote_Count"], errors="coerce").ne(0)),
]


class DataFilter:
    """Drop anomalous rows from the movies DataFrame before indexing."""

    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply all filter rules and log a summary of dropped rows."""
        initial = len(df)
        for label, rule in _RULES:
            mask = rule(df)
            dropped = (~mask).sum()
            if dropped:
                logger.info("  %-35s → %d lignes supprimées", label, dropped)
            df = df[mask]
        logger.info("Filtrage terminé : %d → %d films (-%d)", initial, len(df), initial - len(df))
        return df
