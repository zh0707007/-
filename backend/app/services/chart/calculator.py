from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.schemas.chart import BirthInput, ChartCalculateRequest, ManualBaziInput
from app.services.chart.constants import (
    BRANCH_HIDDEN_STEMS,
    EARTHLY_BRANCHES,
    HEAVENLY_STEMS,
    NAYIN_BY_JIAZI_INDEX,
    STEM_ELEMENTS,
    TEN_GODS_BY_DAY_STEM,
    jiazi_index,
)


class ChartCalculationError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class ChartCalculator:
    """Deterministic Bazi chart calculation facade."""

    def calculate(self, payload: ChartCalculateRequest) -> dict:
        if payload.input_mode == "manual":
            if payload.manual_bazi_input is None:
                raise ChartCalculationError("VALIDATION_ERROR", "四柱模式需要填写完整四柱信息")
            return self._calculate_manual(payload.manual_bazi_input)

        if payload.birth_input is None:
            raise ChartCalculationError("VALIDATION_ERROR", "公历或农历模式需要填写出生信息")

        if payload.input_mode == "lunar" or payload.birth_input.calendar_type == "lunar":
            return self._calculate_lunar(payload.birth_input)

        return self._calculate_solar(payload.birth_input)

    def _calculate_manual(self, manual: ManualBaziInput) -> dict:
        hour_unknown = manual.unknown_birth_hour or not manual.hour_pillar
        pillars = {
            "year": self._pillar_from_text(manual.year_pillar),
            "month": self._pillar_from_text(manual.month_pillar),
            "day": self._pillar_from_text(manual.day_pillar, is_day_master=True),
            "hour": None if hour_unknown else self._pillar_from_text(manual.hour_pillar or ""),
        }
        self._enrich_pillars(pillars)

        return self._build_chart(
            profile={
                "name": manual.name,
                "gender": manual.gender,
                "lunarDateText": None,
                "solarDateTime": None,
                "trueSolarTime": None,
                "birthPlaceText": None,
                "latitude": None,
                "longitude": None,
            },
            pillars=pillars,
            warnings=["未知时辰：仅做年、月、日三柱分析"] if hour_unknown else [],
        )

    def _calculate_solar(self, birth: BirthInput) -> dict:
        Solar, _ = self._load_lunar_python()
        birth_dt = self._parse_datetime(birth.birth_date_time)
        true_solar_dt = self._true_solar_time(birth_dt, birth.birth_place.longitude)
        lunar = Solar.fromYmdHms(
            true_solar_dt.year,
            true_solar_dt.month,
            true_solar_dt.day,
            true_solar_dt.hour,
            true_solar_dt.minute,
            true_solar_dt.second,
        ).getLunar()

        year_gz = lunar.getYearInGanZhiExact()
        month_gz = lunar.getMonthInGanZhiExact()
        day_gz = lunar.getDayInGanZhiExact()
        hour_gz = lunar.getTimeInGanZhi()

        pillars = {
            "year": self._pillar_from_ganzhi(year_gz),
            "month": self._pillar_from_ganzhi(month_gz),
            "day": self._pillar_from_ganzhi(day_gz, is_day_master=True),
            "hour": None
            if birth.unknown_birth_hour
            else self._pillar_from_ganzhi(hour_gz),
        }
        self._enrich_pillars(pillars)

        lunar_text = self._lunar_text(lunar, true_solar_dt)
        warnings = []
        if true_solar_dt.hour >= 23:
            warnings.append("夜子时：23:00 后按次日计算日柱")
        if birth.unknown_birth_hour:
            warnings.append("未知时辰：时柱不做强行推断")

        return self._build_chart(
            profile={
                "name": birth.name,
                "gender": birth.gender,
                "solarDateTime": birth_dt.isoformat(),
                "lunarDateText": lunar_text,
                "trueSolarTime": true_solar_dt.isoformat(),
                "birthPlaceText": f"{birth.birth_place.province}{birth.birth_place.city}",
                "latitude": birth.birth_place.latitude,
                "longitude": birth.birth_place.longitude,
            },
            pillars=pillars,
            warnings=warnings,
            base_year=birth_dt.year,
        )

    def _calculate_lunar(self, birth: BirthInput) -> dict:
        _, Lunar = self._load_lunar_python()
        birth_dt = self._parse_datetime(birth.birth_date_time)
        lunar_month = -birth_dt.month if birth.is_leap_month else birth_dt.month
        lunar = Lunar.fromYmdHms(
            birth_dt.year,
            lunar_month,
            birth_dt.day,
            birth_dt.hour,
            birth_dt.minute,
            birth_dt.second,
        )
        solar = lunar.getSolar()
        solar_dt = birth_dt.replace(year=solar.getYear(), month=solar.getMonth(), day=solar.getDay())
        solar_birth = birth.model_copy(
            update={
                "calendar_type": "solar",
                "birth_date_time": solar_dt.isoformat(),
            }
        )
        result = self._calculate_solar(solar_birth)
        result["profile"]["lunarDateText"] = self._lunar_text(lunar, solar_dt)
        return result

    def _build_chart(
        self,
        profile: dict,
        pillars: dict,
        warnings: list[str],
        base_year: int | None = None,
    ) -> dict:
        request_id = f"req_{uuid4().hex}"
        chart_id = f"chart_{uuid4().hex}"
        day_master = pillars["day"]["stem"]
        five_element_stats = self._five_element_stats(pillars)
        base_year = base_year or datetime.now().year

        return {
            "chartId": chart_id,
            "requestId": request_id,
            "profile": profile,
            "pillars": pillars,
            "dayMaster": day_master,
            "fiveElementStats": five_element_stats,
            "luckCycles": self._placeholder_luck_cycles(base_year, pillars["month"]),
            "annualCycles": self._annual_cycles(base_year),
            "monthlyCycles": self._monthly_cycles(base_year),
            "warnings": warnings,
        }

    def _pillar_from_text(self, text: str, is_day_master: bool = False) -> dict:
        if len(text) != 2 or text[0] not in HEAVENLY_STEMS or text[1] not in EARTHLY_BRANCHES:
            raise ChartCalculationError("INVALID_PILLAR", f"干支不合法：{text}")
        return self._pillar_from_indexes(
            HEAVENLY_STEMS.index(text[0]),
            EARTHLY_BRANCHES.index(text[1]),
            is_day_master=is_day_master,
        )

    def _pillar_from_ganzhi(self, ganzhi: str, is_day_master: bool = False) -> dict:
        return self._pillar_from_text(ganzhi, is_day_master=is_day_master)

    def _pillar_from_indexes(self, stem_index: int, branch_index: int, is_day_master: bool = False) -> dict:
        stem = HEAVENLY_STEMS[stem_index]
        branch = EARTHLY_BRANCHES[branch_index]
        return {
            "stem": stem,
            "branch": branch,
            "tenGod": "日主" if is_day_master else "",
            "hiddenStems": BRANCH_HIDDEN_STEMS[branch],
            "secondaryStars": [],
            "starFortune": "",
            "selfSitting": "",
            "voidBranch": "",
            "nayin": self._nayin(stem, branch),
            "shensha": [],
        }

    def _enrich_pillars(self, pillars: dict) -> None:
        day_stem = pillars["day"]["stem"]
        for key, pillar in pillars.items():
            if pillar is None:
                continue
            if key == "day":
                pillar["tenGod"] = "日主"
            else:
                pillar["tenGod"] = TEN_GODS_BY_DAY_STEM[day_stem][pillar["stem"]]
            pillar["secondaryStars"] = [
                TEN_GODS_BY_DAY_STEM[day_stem][stem] for stem in pillar["hiddenStems"]
            ]

    def _parse_datetime(self, value: str) -> datetime:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone(timedelta(hours=8)))
        return parsed

    def _true_solar_time(self, birth_dt: datetime, longitude: float) -> datetime:
        offset_minutes = (longitude - 120) * 4
        return birth_dt + timedelta(minutes=offset_minutes)

    def _lunar_text(self, lunar, dt: datetime) -> str:
        month = lunar.getMonth()
        leap = "闰" if month < 0 else ""
        return f"{lunar.getYear()}年{leap}{abs(month)}月{lunar.getDay()}日 {dt.hour:02d}:{dt.minute:02d}"

    def _nayin(self, stem: str, branch: str) -> str:
        index = jiazi_index(stem, branch)
        return "" if index is None else NAYIN_BY_JIAZI_INDEX[index]

    def _five_element_stats(self, pillars: dict) -> dict[str, int]:
        stats = {"木": 0, "火": 0, "土": 0, "金": 0, "水": 0}
        for pillar in pillars.values():
            if pillar is None:
                continue
            stats[STEM_ELEMENTS[pillar["stem"]]] += 1
            for hidden_stem in pillar["hiddenStems"]:
                stats[STEM_ELEMENTS[hidden_stem]] += 1
        return stats

    def _placeholder_luck_cycles(self, base_year: int, month_pillar: dict) -> list[dict]:
        month_index = jiazi_index(month_pillar["stem"], month_pillar["branch"]) or 0
        cycles = []
        for index in range(8):
            jiazi = (month_index + index + 1) % 60
            stem = HEAVENLY_STEMS[jiazi % 10]
            branch = EARTHLY_BRANCHES[jiazi % 12]
            start_year = base_year + index * 10
            cycles.append(
                {
                    "index": index + 1,
                    "startYear": start_year,
                    "endYear": start_year + 9,
                    "startAge": index * 10 + 1,
                    "endAge": index * 10 + 10,
                    "stem": stem,
                    "branch": branch,
                    "tenGodStem": None,
                    "tenGodBranch": None,
                    "isCurrent": index == 0,
                }
            )
        return cycles

    def _annual_cycles(self, base_year: int) -> list[dict]:
        current_year = datetime.now().year
        start = current_year - 5
        return [
            {
                "year": year,
                "age": None,
                "stem": HEAVENLY_STEMS[(year - 4) % 10],
                "branch": EARTHLY_BRANCHES[(year - 4) % 12],
                "tenGodStem": None,
                "tenGodBranch": None,
                "isCurrent": year == current_year,
                "relationSummary": "",
            }
            for year in range(start, start + 11)
        ]

    def _monthly_cycles(self, year: int) -> list[dict]:
        solar_terms = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"]
        return [
            {
                "index": index + 1,
                "solarTerm": term,
                "solarTermDate": f"{year}-{index + 2:02d}-01",
                "stem": HEAVENLY_STEMS[(year + index) % 10],
                "branch": EARTHLY_BRANCHES[(index + 2) % 12],
                "relationSummary": "",
                "isCurrent": index == datetime.now().month - 1,
            }
            for index, term in enumerate(solar_terms)
        ]

    def _load_lunar_python(self):
        try:
            from lunar_python import Lunar, Solar
        except ImportError as exc:
            raise ChartCalculationError(
                "CHART_CALCULATION_ERROR",
                "缺少 lunar-python 依赖，无法进行公历/农历排盘。请先安装后端依赖。",
            ) from exc
        return Solar, Lunar
