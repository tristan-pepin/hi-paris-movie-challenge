from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/analytics")


@router.get("/projection")
def get_projection(request: Request):
    """Return 2D UMAP coordinates for all films with embeddings."""
    return request.app.state.projection
