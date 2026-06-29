# Movie explorer

> **[📄 Lire le rapport de synthèse](report/rapport.md)**

> Challenge Hi-Paris — visualisation d'une base de 9 837 films (TMDB).
> Stack : React + Vite · FastAPI · ChromaDB · OpenAI embeddings · EVoC

## Prérequis

- Python 3.11+
- Node 18+
- Une clé API OpenAI

## Démarrage

```bash
# 1. Cloner
git clone <repo>
cd hi-paris-movie-challenge

# 2. Backend
cp backend/.env.example backend/.env   # renseigner OPENAI_API_KEY
cd backend
uv sync
uvicorn main:app --reload

# 3. Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173.

## Données

Placer `movies.csv` dans `backend/data/` avant de démarrer le backend.

## Premier démarrage

Le backend effectue trois opérations en séquence, mises en cache dans `backend/cache/` :

1. **Embeddings OpenAI** (~9 700 synopsis, `text-embedding-3-small`) — ~2-3 min
2. **Indexation ChromaDB** (cosine similarity) — ~1 min
3. **Projection 2D EVoC** (node embedding sur le graphe KNN) — ~1-2 min

Les démarrages suivants sont quasi-instantanés (lecture des caches).

## Structure

```
├── backend/
│   ├── main.py                      # app FastAPI, lifespan, CORS
│   ├── routers/
│   │   ├── movies.py                # GET /api/movies, /api/movies/{id}, /api/movies/meta
│   │   ├── recommendations.py       # POST /api/recommendations
│   │   └── analytics.py            # GET /api/analytics/projection
│   ├── services/
│   │   ├── embeddings.py            # cache embeddings .npy + indexation ChromaDB
│   │   ├── preprocessing.py         # DataFilter — nettoyage anomalies CSV
│   │   └── projection.py            # projection 2D via EVoC node embedding
│   ├── notebooks/
│   │   └── eda.ipynb                # analyse exploratoire + détection d'anomalies
│   └── data/movies.csv              # dataset TMDB (non commité)
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── MovieList.jsx        # liste paginée avec filtres
    │   │   └── EmbeddingMap.jsx     # carte interactive des embeddings
    │   ├── components/
    │   │   ├── MovieCard.jsx        # carte film (poster, note, genres, contenu adulte)
    │   │   └── MovieDrawer.jsx      # détail + films similaires
    │   └── api/client.js            # instance axios
    └── vite.config.js               # proxy /api → localhost:8000
```

## ChromaDB embarqué

ChromaDB fonctionne en mode embarqué (`PersistentClient`) : il s'initialise directement dans le processus FastAPI et persiste ses données dans `backend/cache/chroma/`. Aucun service externe à démarrer.

## Qualité des données

L'analyse exploratoire (`backend/notebooks/eda.ipynb`) a révélé plusieurs anomalies dans le dataset TMDB. Elles sont filtrées au démarrage par `services/preprocessing.py` avant toute indexation.

| Anomalie | Lignes | % dataset | Raison du filtrage |
|---|---|---|---|
| `Vote_Count = 0` | ~100 | 1,02 % | Aucun engagement utilisateur, note non fiable |
| `Poster_Url` manquante | 11 | 0,11 % | Expérience dégradée sans visuel |
| `Title` manquant | 9 | 0,09 % | Donnée non exploitable |
| `Overview` purement numérique | 1 | 0,01 % | Décalage de colonne CSV |
| URL dans `Original_Language` | 1 | 0,01 % | Décalage de colonne CSV |
| Code langue > 3 chars | 1 | 0,01 % | Hors norme ISO 639-1 |

**Dataset final : ~9 714 films sur 9 837.**

Les films à contenu adulte (détectés par mots-clés dans le titre/synopsis) restent dans le dataset mais sont affichés avec le poster flouté et une confirmation requise au clic (`adult: bool` retourné par l'API, géré côté frontend dans `MovieCard`).

## Choix techniques

- **`text-embedding-3-small`** — bon compromis coût/qualité pour des synopsis courts (~$0.10 pour 10k)
- **ChromaDB local** — pas de service externe, persistance fichier dans `cache/`
- **Cosine similarity** — robuste aux variations de longueur des synopsis
- **EVoC node embedding** — projection 2D spécialisée pour les vecteurs d'embeddings haute dimension, plus rapide qu'UMAP ; l'algorithme est utilisé via ses briques internes (`knn_graph` → `neighbor_graph_matrix` → `node_embedding`)
- **D3 canvas** — rendu de ~10k points avec zoom/pan fluide ; SVG trop lent à cette échelle
- **Pandas + FastAPI** — dataset statique, pas besoin d'ORM ni de base relationnelle

## Limites connues

- `collection.count()` de ChromaDB prend ~3-4s au démarrage (limitation du client embarqué)
- Synopsis courts ou génériques limitent la qualité des recommandations
- Les clusters de la carte suivent la sémantique des synopsis plutôt que les genres TMDB — c'est un résultat attendu : un film d'action spatial sera plus proche d'un film de SF que d'autres films d'action
- Données statiques : pas de mise à jour sans redémarrage et recalcul des caches
