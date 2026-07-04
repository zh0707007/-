from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.responses import error_response, success_response
from app.db.session import get_db
from app.models.analysis import AnalysisResult
from app.models.chart import Chart
from app.models.report import PdfReport
from app.schemas.report import PdfReportRequest
from app.services.report.pdf import PdfReportService

router = APIRouter()
pdf_service = PdfReportService()


@router.post("/pdf")
def generate_pdf_report(payload: PdfReportRequest, db: Session = Depends(get_db)):
    chart_record = db.get(Chart, payload.chart_id)
    if chart_record is None:
        return error_response("CHART_NOT_FOUND", "未找到对应命盘", status_code=404)

    analysis_record = db.get(AnalysisResult, payload.analysis_id)
    if analysis_record is None or analysis_record.chart_id != payload.chart_id:
        return error_response("ANALYSIS_NOT_FOUND", "未找到对应 AI 解读", status_code=404)

    try:
        report = pdf_service.render(chart_record.chart_data, analysis_record.result_data)
    except Exception:
        return error_response("PDF_RENDER_ERROR", "PDF 报告生成失败", status_code=500)

    report_record = PdfReport(
        id=report["reportId"],
        chart_id=payload.chart_id,
        analysis_id=payload.analysis_id,
        file_name=report["fileName"],
        file_path=report["filePath"],
        download_url=report["downloadUrl"],
        status=report["status"],
        expires_at=datetime.fromisoformat(report["expiresAt"]),
    )
    db.add(report_record)
    db.commit()

    return success_response(
        {
            "reportId": report["reportId"],
            "chartId": report["chartId"],
            "analysisId": report["analysisId"],
            "fileName": report["fileName"],
            "downloadUrl": report["downloadUrl"],
            "expiresAt": report["expiresAt"],
            "status": report["status"],
        }
    )


@router.get("/download/{report_id}")
def download_pdf_report(report_id: str, db: Session = Depends(get_db)):
    report_record = db.get(PdfReport, report_id)
    if report_record is None:
        return error_response("REPORT_NOT_FOUND", "未找到对应 PDF 报告", status_code=404)

    expires_at = report_record.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        return error_response("REPORT_EXPIRED", "PDF 下载链接已过期", status_code=410)

    file_path = Path(report_record.file_path)
    if not file_path.exists():
        return error_response("REPORT_STORAGE_ERROR", "PDF 文件不存在", status_code=500)

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=report_record.file_name,
    )
