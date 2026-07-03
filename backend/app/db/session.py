from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.analysis import AnalysisResult
from app.models.base import Base
from app.models.chart import Chart, ChartRequest
from app.models.report import PdfReport

_ = (AnalysisResult, Chart, ChartRequest, PdfReport)


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
_initialized = False


def get_db():
    init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    global _initialized
    if _initialized:
        return
    if settings.database_url.startswith("sqlite:///./"):
        db_path = Path(settings.database_url.removeprefix("sqlite:///"))
        db_path.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    _initialized = True
