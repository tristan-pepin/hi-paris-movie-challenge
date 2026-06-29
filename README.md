# Movie Explorer

> Challenge Hi-Paris — visualisation d'une base de 9 837 films (TMDB).
> Stack : React + Vite · FastAPI · ChromaDB · OpenAI embeddings

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

Le backend calcule les embeddings OpenAI (~9 800 synopsis, ~2-3 min) et indexe ChromaDB au premier lancement. Les résultats sont mis en cache dans `backend/cache/` — les démarrages suivants sont instantanés.

## Structure

```
├── backend/
│   ├── main.py                  # app FastAPI, lifespan, CORS
│   ├── routers/
│   │   ├── movies.py            # GET /api/movies, /api/movies/{id}, /api/movies/meta
│   │   └── recommendations.py   # POST /api/recommendations
│   ├── services/
│   │   └── embeddings.py        # cache embeddings .npy + indexation ChromaDB
│   └── data/movies.csv          # dataset TMDB (non commité)
└── frontend/
    ├── src/
    │   ├── pages/MovieList.jsx  # liste paginée avec filtres
    │   ├── components/
    │   │   ├── MovieCard.jsx    # carte film (poster, note, genres)
    │   │   └── MovieDrawer.jsx  # détail + films similaires
    │   └── api/client.js        # instance axios
    └── vite.config.js           # proxy /api → localhost:8000
```

## Pas de serveur ChromaDB à lancer

ChromaDB fonctionne ici en mode embarqué (`PersistentClient`) : il s'initialise directement dans le processus FastAPI et persiste ses données dans `backend/cache/chroma/`. Aucun service externe à démarrer.

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

**Total filtré : ~123 films sur 9 837 (~1,25 %). Le dataset final compte ~9 714 films.**

## Choix techniques

- **`text-embedding-3-small`** — bon compromis coût/qualité pour des synopsis courts
- **ChromaDB local** — pas de service externe, persistance fichier dans `cache/`
- **Cosine similarity** — robuste aux variations de longueur des synopsis
- **Pandas + FastAPI** — dataset statique, pas besoin d'ORM ni de base relationnelle
