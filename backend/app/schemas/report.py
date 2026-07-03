from pydantic import BaseModel, Field


class PdfReportRequest(BaseModel):
    chart_id: str = Field(alias="chartId")
    analysis_id: str = Field(alias="analysisId")

    model_config = {"populate_by_name": True}
