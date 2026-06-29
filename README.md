# Movie Explorer

> Challenge Hi-Paris — visualisation d'une base de 9 837 films (TMDB).
> Stack : React + Vite · FastAPI · ChromaDB · OpenAI embeddings

## Prérequis

- Python 3.11+
- Node 18+
- Une clé OpenAI (pour le calcul des embeddings, PR #3)

## Démarrage

```bash
# 1. Cloner et configurer
git clone <repo>
cd hi-paris-movie-challenge

# 2. Backend
cp backend/.env.example backend/.env   # puis renseigner OPENAI_API_KEY
cd backend
uv sync                                 # ou: pip install -r requirements.txt
uvicorn main:app --reload

# 3. Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173.

## Données

Placer le fichier `movies.csv` dans `backend/data/` avant de démarrer le backend.
