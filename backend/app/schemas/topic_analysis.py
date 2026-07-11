from pydantic import BaseModel, Field


class TopicAnalysisGenerateRequest(BaseModel):
    chart_id: str = Field(alias="chartId")
    topic_slug: str = Field(alias="topicSlug")
    analysis_id: str | None = Field(default=None, alias="analysisId")

    model_config = {"populate_by_name": True}
