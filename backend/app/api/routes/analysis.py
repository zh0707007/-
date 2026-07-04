from fastapi import APIRouter, Depends
from sqlalchemy import select
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


@router.get("/chart/{chart_id}/latest")
def get_latest_analysis(chart_id: str, db: Session = Depends(get_db)):
    chart_record = db.get(Chart, chart_id)
    if chart_record is None:
        return error_response("CHART_NOT_FOUND", "未找到对应命盘", status_code=404)

    analysis_record = db.scalars(
        select(AnalysisResult)
        .where(AnalysisResult.chart_id == chart_id)
        .order_by(AnalysisResult.created_at.desc())
        .limit(1)
    ).first()
    if analysis_record is None:
        return error_response("ANALYSIS_NOT_FOUND", "未找到对应 AI 解读", status_code=404)

    return success_response(analysis_record.result_data)


@router.get("/{analysis_id}")
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    analysis_record = db.get(AnalysisResult, analysis_id)
    if analysis_record is None:
        return error_response("ANALYSIS_NOT_FOUND", "未找到对应 AI 解读", status_code=404)

    return success_response(analysis_record.result_data)
