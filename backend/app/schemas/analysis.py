from pydantic import BaseModel, Field


class AnalysisOptions(BaseModel):
    include_career: bool = Field(default=True, alias="includeCareer")
    include_wealth: bool = Field(default=True, alias="includeWealth")
    include_relationship: bool = Field(default=True, alias="includeRelationship")
    include_health: bool = Field(default=True, alias="includeHealth")
    include_history_calibration: bool = Field(default=True, alias="includeHistoryCalibration")
    years_to_look_ahead: int = Field(default=3, alias="yearsToLookAhead")

    model_config = {"populate_by_name": True}


class AnalysisGenerateRequest(BaseModel):
    chart_id: str = Field(alias="chartId")
    analysis_options: AnalysisOptions = Field(default_factory=AnalysisOptions, alias="analysisOptions")

    model_config = {"populate_by_name": True}
