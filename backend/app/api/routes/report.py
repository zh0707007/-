from fastapi import APIRouter

from app.api.responses import not_implemented_response
from app.schemas.report import PdfReportRequest

router = APIRouter()


@router.post("/pdf")
def generate_pdf_report(payload: PdfReportRequest):
    return not_implemented_response(f"PDF report generation for {payload.chart_id}")
