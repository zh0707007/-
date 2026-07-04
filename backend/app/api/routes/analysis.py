from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.responses import error_response, success_response
from app.db.session import get_db
from app.models.analysis import AnalysisResult
from app.models.chart import Chart
from app.schemas.analysis import AnalysisGenerateRequest
from app.services.llm.client import LlmClient

router = APIRouter()
llm_client = LlmClient()


@router.post("/generate")
def generate_analysis(payload: AnalysisGenerateRequest, db: Session = Depends(get_db)):
    chart_record = db.get(Chart, payload.chart_id)
    if chart_record is None:
        return error_response("CHART_NOT_FOUND", "未找到对应命盘", status_code=404)

    analysis = llm_client.generate(chart_record.chart_data, payload.analysis_options)
    analysis_record = AnalysisResult(
        id=analysis["analysisId"],
        chart_id=payload.chart_id,
        result_data=analysis,
        model_name=analysis.get("modelName"),
        status=analysis["status"],
    )
    db.add(analysis_record)
    db.commit()

    return success_response(analysis)
