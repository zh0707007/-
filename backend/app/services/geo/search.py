from app.services.geo.cities import CITY_DATA


class GeoSearchService:
    """Built-in prefecture-level city search for v1 local delivery."""

    def search(self, keyword: str) -> list[dict]:
        normalized = self._normalize(keyword)
        if not normalized:
            return []

        compact_keyword = self._compact(normalized)
        matches = []
        for index, city in enumerate(CITY_DATA):
            haystacks = self._haystacks(city)
            score = self._match_score(normalized, compact_keyword, haystacks)
            if score is not None:
                matches.append((score, index, city))

        return [city for _, _, city in sorted(matches, key=lambda item: (item[0], item[1]))[:10]]

    def _match_score(
        self,
        keyword: str,
        compact_keyword: str,
        haystacks: dict[str, set[str]],
    ) -> int | None:
        if keyword in haystacks["exact"] or compact_keyword in haystacks["compact_exact"]:
            return 0
        if keyword in haystacks["full"] or compact_keyword in haystacks["compact_full"]:
            return 1
        if keyword in haystacks["city"] or compact_keyword in haystacks["compact_city"]:
            return 2
        if keyword in haystacks["province"] or compact_keyword in haystacks["compact_province"]:
            return 3
        return None

    def _haystacks(self, city: dict) -> dict[str, set[str]]:
        name = self._normalize(city["name"])
        province = self._normalize(city["province"])
        city_name = self._normalize(city["city"])
        full_name = self._normalize(f"{city['province']}{city['city']}")
        exact = {name, full_name, city_name}
        return {
            "exact": exact,
            "full": {name, full_name},
            "city": {city_name},
            "province": {province},
            "compact_exact": {self._compact(value) for value in exact},
            "compact_full": {self._compact(name), self._compact(full_name)},
            "compact_city": {self._compact(city_name)},
            "compact_province": {self._compact(province)},
        }

    def _normalize(self, value: str) -> str:
        return "".join(str(value).split())

    def _compact(self, value: str) -> str:
        compacted = self._normalize(value)
        for text in (
            "特别行政区",
            "壮族自治区",
            "回族自治区",
            "维吾尔自治区",
            "自治区",
            "省",
            "市",
            "地区",
            "盟",
            "自治州",
            "州",
        ):
            compacted = compacted.replace(text, "")
        return compacted
