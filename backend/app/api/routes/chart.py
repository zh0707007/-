from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from app.api.responses import error_response, success_response
from app.db.session import get_db
from app.models.chart import Chart, ChartRequest
from app.schemas.chart import ChartCalculateRequest
from app.services.chart.calculator import ChartCalculationError, ChartCalculator

router = APIRouter()
calculator = ChartCalculator()


@router.post("/calculate")
def calculate_chart(payload: ChartCalculateRequest, db: Session = Depends(get_db)):
    try:
        chart = calculator.calculate(payload)
    except ChartCalculationError as exc:
        status_code = 400 if exc.code in {"VALIDATION_ERROR", "INVALID_PILLAR", "CALENDAR_CONVERT_ERROR"} else 500
        return error_response(exc.code, exc.message, status_code=status_code)

    chart_request = ChartRequest(
        id=chart["requestId"],
        raw_input=payload.model_dump(mode="json", by_alias=True),
        normalized_input=None,
        status="calculated",
    )
    chart_record = Chart(
        id=chart["chartId"],
        request_id=chart_request.id,
        chart_data=chart,
        warnings=chart.get("warnings", []),
    )
    db.add(chart_request)
    db.add(chart_record)
    db.commit()

    return success_response(chart)


@router.get("/{chart_id}")
def get_chart(chart_id: str, db: Session = Depends(get_db)):
    chart_record = db.get(Chart, chart_id)
    if chart_record is None:
        return error_response("CHART_NOT_FOUND", "未找到对应命盘", status_code=404)

    return success_response(chart_record.chart_data)
