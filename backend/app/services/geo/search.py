from app.services.geo.cities import CITY_DATA


class GeoSearchService:
    """Built-in city search for v1 local delivery."""

    def search(self, keyword: str) -> list[dict]:
        normalized = keyword.strip()
        if not normalized:
            return []

        return [
            city
            for city in CITY_DATA
            if normalized in city["name"]
            or normalized in city["province"]
            or normalized in city["city"]
        ]
