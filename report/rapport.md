# Note de synthèse — Visualisation d'une base de données de films

**Challenge Hi-Paris · Tristan Pépin**

---

## Méthode

### Vision générale

L'objectif était de construire une plateforme explorable, pas un tableau de bord statique. À partir de 9 837 films TMDB (titre, synopsis, note, genre, langue, poster), j'ai conçu deux modes de navigation complémentaires : une **liste filtrée** pour chercher par critères, et une **carte sémantique** pour explorer la structure latente du corpus.

### Architecture

```
movies.csv → DataFilter → DataFrame (pandas)
                              ├── API REST (FastAPI)
                              │     ├── GET /movies        — liste + filtres
                              │     ├── GET /movies/{id}   — détail
                              │     └── POST /recommendations
                              └── Pipeline embeddings
                                    ├── OpenAI text-embedding-3-small (synopsis)
                                    ├── ChromaDB (recherche cosinus)
                                    └── EVoC node embedding → projection 2D
```

**Stack :** React + Vite (frontend) · FastAPI + pandas (backend) · ChromaDB · OpenAI API · EVoC

### Traitement des données

Une classe `DataFilter` filtre le CSV à chaque démarrage avant toute indexation. Six règles éliminent les lignes non exploitables (titre manquant, poster absent, `Original_Language` contenant une URL — décalage de colonne CSV —, code langue hors ISO 639-1, synopsis purement numérique, `Vote_Count = 0`). Ces anomalies ont été identifiées dans un notebook EDA. Résultat : **9 714 films retenus sur 9 837** (< 1,3 % éliminés).

### Embeddings et recommandations

Chaque synopsis est encodé avec `text-embedding-3-small` (OpenAI), mis en cache localement (`.npy`) et indexé dans ChromaDB (similarité cosinus). Quand un utilisateur ouvre un film, un appel `POST /recommendations` retourne les 9 films dont le synopsis est sémantiquement le plus proche — indépendamment du genre déclaré.

### Projection 2D

Les vecteurs d'embeddings (1 536 dimensions) sont projetés en 2D via les briques internes d'**EVoC** (`knn_graph` → `neighbor_graph_matrix` → `node_embedding`), algorithme conçu pour les vecteurs haute dimension. La projection est mise en cache dans `cache/projection.json`.

---

## Fonctionnalités principales

### 1. Liste filtrée avec statistiques contextuelles

La vue principale affiche les films en grille (24 par page) avec cinq filtres combinables : recherche textuelle, genre (avec nombre de films), langue, décennie, note minimale. Une barre de stats contextuelle indique le nombre de résultats, la note moyenne de la sélection, et la note moyenne du genre filtré.

Chaque carte affiche poster, titre, année, badge note coloré (vert ≥ 7, orange ≥ 5, rouge < 5) et les deux genres principaux. Une attention particulière a été portée aux contenus adultes présents dans le dataset : ils sont détectés par mots-clés dans le titre et le synopsis, le poster est flouté avec un badge 18+, et une confirmation explicite est requise avant d'afficher le contenu.

Au clic, un panneau latéral (drawer) affiche le détail complet : synopsis, votes, note par genre, note des films similaires, note de la sélection en cours — et une grille de 9 films similaires cliquables.

**Figure 1 — Vue liste avec filtres et drawer ouvert**

### 2. Carte sémantique des embeddings

La page `/map` affiche les ~9 700 films comme un nuage de points sur canvas D3 (SVG trop lent à cette échelle). Chaque point est coloré par genre principal. Zoom et pan natifs via `d3-zoom`. Au survol, un tooltip affiche le poster miniature, le titre, l'année et la note. Au clic, le même drawer s'ouvre.

Une barre de recherche filtre les points par titre en temps réel : les films correspondants restent colorés, les autres s'estompent en gris.

**Figure 2 — Carte sémantique avec clusters thématiques**

Les clusters ne suivent pas strictement les genres TMDB — c'est un résultat intentionnellement intéressant : les embeddings de synopsis capturent des similarités thématiques plus fines que les catégories prédéfinies. Un film d'action spatial se retrouve plus près de la SF que des autres films d'action.

---

## Limites et améliorations possibles

Les améliorations listées ci-dessous représentent des pistes identifiées durant le challenge mais non implémentées, dans le but de rester dans la limite indicative de 3 heures imposée par le sujet.

**Limites actuelles**

- **Données** : le CSV ne contient pas de réalisateur, d'acteurs, de durée ni de budget. La multimodalité repose uniquement sur le texte (synopsis) et les images (posters).
- **Synopsis courts ou génériques** : la qualité des recommandations est bornée par la richesse du synopsis. Un film avec "No overview available" aura des voisins peu pertinents.
- **Démarrage** : le comptage ChromaDB prend ~3-4 secondes au démarrage (limitation connue du client embarqué). Les embeddings et la projection sont mis en cache mais le premier calcul prend ~5 minutes.
- **Données statiques** : aucune mise à jour sans redémarrage complet.
- **Clusters visuels** : la projection 2D est une approximation — les distances dans l'espace d'origine ne sont pas toutes préservées.

**Améliorations possibles**

- **Enrichissement des données** : appel à l'API TMDB (réalisateur, casting, durée, budget) pour une recherche et une visualisation plus riches. Coloration de la carte par note ou par décennie.
- **Tests backend** : la logique métier (DataFilter, sérialisation, recommandations) n'est pas couverte par des tests automatisés. L'ajout de tests unitaires et d'intégration (pytest + TestClient FastAPI) améliorerait la fiabilité et faciliterait les évolutions futures.
- **Déploiement** : l'application tourne actuellement en local. Un déploiement propre sur une VM (ex. GCP, AWS, OVH) avec reverse proxy (Nginx), gestion des variables d'environnement, et conteneurisation (Docker Compose) permettrait un accès partagé et une démonstration sans dépendance à la machine locale.
- **Comptes utilisateurs** : l'ajout d'une base utilisateurs (PostgreSQL + authentification JWT) ouvrirait des fonctionnalités sociales : shortlist personnelle, historique de navigation, notes utilisateur.
- **Feedback utilisateur** : collecter les clics sur "Films similaires" et les shortlists permettrait d'améliorer les recommandations (fine-tuning du ranking, détection des embeddings peu pertinents) et d'évaluer objectivement la qualité du système.
- **Stockage des données** : le dataset vit actuellement dans un fichier CSV local non versionné. Le migrer vers une base relationnelle (PostgreSQL) hébergée dans le cloud centraliserait la source de vérité, faciliterait les mises à jour du catalogue, et permettrait des requêtes plus fines sans charger l'intégralité du fichier en mémoire au démarrage.

---

## Usage des outils d'IA

**Outil utilisé :** Claude Code (Anthropic) via CLI, modèle Claude Sonnet.

| Tâche | Réalisé par |
|---|---|
| Scoping du projet, choix d'architecture, priorisation des fonctionnalités | Moi |
| Choix des outils (EVoC, ChromaDB, `text-embedding-3-small`) et justification | Moi |
| Code de base du backend (routers FastAPI, DataFilter, pipeline embeddings) | Moi, avec aide IA pour docstrings et refactoring |
| Frontend complet (React, D3, Tailwind) | IA — pas de compétence frontend de mon côté |
| Détection de bugs (batch ChromaDB, sérialisation NaN, KeyError reco) | IA pour le diagnostic et le fix, après identification du problème par moi |
| Rédaction de ce rapport | IA, à partir de mes notes et du plan de développement |

**Vérifications réalisées :** chaque fonctionnalité a été testée manuellement (filtres, recommandations, carte, contenu adulte). Les choix méthodologiques (EVoC vs UMAP, ChromaDB local vs service distant, pandas vs ORM) ont été évalués et décidés avant implémentation. Le code backend (routers, preprocessing, projection) est lisible et explicable ligne par ligne.
