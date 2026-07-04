from fastapi import APIRouter, Query

from app.api.responses import error_response, success_response
from app.services.geo.search import GeoSearchService

router = APIRouter()
service = GeoSearchService()


@router.get("/search")
def search_geo(keyword: str = Query(min_length=1, max_length=30)):
    results = service.search(keyword)
    if not results:
        return error_response("GEO_NOT_FOUND", "未找到地区", status_code=404)
    return success_response(results)
