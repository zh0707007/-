from fastapi import APIRouter

from app.api.responses import not_implemented_response
from app.schemas.analysis import AnalysisGenerateRequest

router = APIRouter()


@router.post("/generate")
def generate_analysis(payload: AnalysisGenerateRequest):
    return not_implemented_response(f"analysis generation for {payload.chart_id}")
