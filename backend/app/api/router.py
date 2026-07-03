from fastapi import APIRouter

from app.api.routes import analysis, chart, geo, report

api_router = APIRouter()
api_router.include_router(geo.router, prefix="/geo", tags=["geo"])
api_router.include_router(chart.router, prefix="/chart", tags=["chart"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(report.router, prefix="/report", tags=["report"])
