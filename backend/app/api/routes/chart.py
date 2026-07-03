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
        status_code = 400 if exc.code in {"VALIDATION_ERROR", "INVALID_PILLAR"} else 500
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
