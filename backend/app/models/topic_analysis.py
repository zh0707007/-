from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TopicAnalysisResult(Base):
    __tablename__ = "topic_analysis_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    chart_id: Mapped[str] = mapped_column(String(64), index=True)
    analysis_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    topic_slug: Mapped[str] = mapped_column(String(64), index=True)
    result_data: Mapped[dict] = mapped_column(JSON)
    model_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
