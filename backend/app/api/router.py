from fastapi import APIRouter

from app.api.routes import admin, analysis, chart, geo, platform, report, topic_analysis

api_router = APIRouter()
api_router.include_router(geo.router, prefix="/geo", tags=["geo"])
api_router.include_router(chart.router, prefix="/chart", tags=["chart"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(topic_analysis.router, prefix="/topic-analysis", tags=["topic-analysis"])
api_router.include_router(report.router, prefix="/report", tags=["report"])
api_router.include_router(platform.router, prefix="/user", tags=["user"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
