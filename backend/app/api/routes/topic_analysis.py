from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends

from app.api.responses import error_response, success_response
from app.db.session import get_db
from app.models.analysis import AnalysisResult
from app.models.chart import Chart
from app.models.topic_analysis import TopicAnalysisResult
from app.schemas.topic_analysis import TopicAnalysisGenerateRequest
from app.services.llm.client import LlmClient
from app.services.llm.topics import TOPIC_DEFINITIONS, get_topic_definition

router = APIRouter()
llm_client = LlmClient()


def topic_payload(record: TopicAnalysisResult) -> dict:
    return record.result_data


@router.get("/topics")
def list_topics():
    return success_response(
        [
            {
                "topicSlug": slug,
                "title": topic["title"],
                "sourceTitles": topic["sourceTitles"],
                "focus": topic["focus"],
            }
            for slug, topic in TOPIC_DEFINITIONS.items()
        ]
    )


@router.post("/generate")
def generate_topic_analysis(payload: TopicAnalysisGenerateRequest, db: Session = Depends(get_db)):
    topic = get_topic_definition(payload.topic_slug)
    if topic is None:
        return error_response("INVALID_TOPIC", "未知专题类型", status_code=400)

    chart_record = db.get(Chart, payload.chart_id)
    if chart_record is None:
        return error_response("CHART_NOT_FOUND", "未找到对应命盘", status_code=404)

    base_analysis = None
    if payload.analysis_id:
        analysis_record = db.get(AnalysisResult, payload.analysis_id)
        if analysis_record is None or analysis_record.chart_id != payload.chart_id:
            return error_response("ANALYSIS_NOT_FOUND", "未找到对应 AI 解读", status_code=404)
        base_analysis = analysis_record.result_data

    try:
        result = llm_client.generate_topic(chart_record.chart_data, payload.topic_slug, base_analysis)
    except ValueError:
        return error_response("INVALID_TOPIC", "未知专题类型", status_code=400)

    result["analysisId"] = payload.analysis_id
    record = TopicAnalysisResult(
        id=result["topicAnalysisId"],
        chart_id=payload.chart_id,
        analysis_id=payload.analysis_id,
        topic_slug=payload.topic_slug,
        result_data=result,
        model_name=result.get("modelName"),
        status=result["status"],
    )
    db.add(record)
    db.commit()

    return success_response(result)


@router.get("/chart/{chart_id}/latest")
def get_latest_topics_for_chart(chart_id: str, db: Session = Depends(get_db)):
    chart_record = db.get(Chart, chart_id)
    if chart_record is None:
        return error_response("CHART_NOT_FOUND", "未找到对应命盘", status_code=404)

    latest: list[dict] = []
    for topic_slug in TOPIC_DEFINITIONS:
        record = db.scalars(
            select(TopicAnalysisResult)
            .where(TopicAnalysisResult.chart_id == chart_id)
            .where(TopicAnalysisResult.topic_slug == topic_slug)
            .order_by(TopicAnalysisResult.created_at.desc())
            .limit(1)
        ).first()
        if record is not None:
            latest.append(topic_payload(record))
    return success_response(latest)


@router.get("/chart/{chart_id}/{topic_slug}/latest")
def get_latest_topic_analysis(chart_id: str, topic_slug: str, db: Session = Depends(get_db)):
    if get_topic_definition(topic_slug) is None:
        return error_response("INVALID_TOPIC", "未知专题类型", status_code=400)
    chart_record = db.get(Chart, chart_id)
    if chart_record is None:
        return error_response("CHART_NOT_FOUND", "未找到对应命盘", status_code=404)

    record = db.scalars(
        select(TopicAnalysisResult)
        .where(TopicAnalysisResult.chart_id == chart_id)
        .where(TopicAnalysisResult.topic_slug == topic_slug)
        .order_by(TopicAnalysisResult.created_at.desc())
        .limit(1)
    ).first()
    if record is None:
        return error_response("TOPIC_ANALYSIS_NOT_FOUND", "未找到对应专题解读", status_code=404)
    return success_response(topic_payload(record))


@router.get("/{topic_analysis_id}")
def get_topic_analysis(topic_analysis_id: str, db: Session = Depends(get_db)):
    record = db.get(TopicAnalysisResult, topic_analysis_id)
    if record is None:
        return error_response("TOPIC_ANALYSIS_NOT_FOUND", "未找到对应专题解读", status_code=404)
    return success_response(topic_payload(record))
