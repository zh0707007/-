from pydantic import BaseModel, Field


class PdfReportRequest(BaseModel):
    chart_id: str = Field(alias="chartId")
    analysis_id: str = Field(alias="analysisId")

    model_config = {"populate_by_name": True}


class PdfReportPayload(BaseModel):
    report_id: str = Field(alias="reportId")
    chart_id: str = Field(alias="chartId")
    analysis_id: str = Field(alias="analysisId")
    file_name: str = Field(alias="fileName")
    download_url: str = Field(alias="downloadUrl")
    expires_at: str = Field(alias="expiresAt")
    status: str

    model_config = {"populate_by_name": True}
