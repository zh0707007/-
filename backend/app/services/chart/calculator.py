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
            luck_start=self._manual_luck_start(pillars["year"]["stem"], manual.gender),
        )

    def _calculate_solar(self, birth: BirthInput) -> dict:
        Solar, _ = self._load_lunar_python()
        try:
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
        except (ValueError, TypeError) as exc:
            raise ChartCalculationError("CALENDAR_CONVERT_ERROR", "出生时间格式不合法，无法换算历法") from exc

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
        direction = self._luck_direction(pillars["year"]["stem"], birth.gender)

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
            luck_start=self._luck_start_from_jie(lunar, true_solar_dt, direction),
        )

    def _calculate_lunar(self, birth: BirthInput) -> dict:
        _, Lunar = self._load_lunar_python()
        try:
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
        except (ValueError, TypeError) as exc:
            raise ChartCalculationError("CALENDAR_CONVERT_ERROR", "农历日期不合法，无法换算公历") from exc
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
        luck_start: dict | None = None,
    ) -> dict:
        request_id = f"req_{uuid4().hex}"
        chart_id = f"chart_{uuid4().hex}"
        day_master = pillars["day"]["stem"]
        five_element_stats = self._five_element_stats(pillars)
        base_year = base_year or datetime.now().year
        luck_start = luck_start or self._manual_luck_start(pillars["year"]["stem"], profile["gender"])

        return {
            "chartId": chart_id,
            "requestId": request_id,
            "profile": profile,
            "pillars": pillars,
            "dayMaster": day_master,
            "fiveElementStats": five_element_stats,
            "luckStart": luck_start,
            "luckCycles": self._luck_cycles(base_year, pillars, profile["gender"], luck_start),
            "annualCycles": self._annual_cycles(base_year, day_master),
            "monthlyCycles": self._monthly_cycles(datetime.now().year, day_master),
            "dailyCycle": self._daily_cycle(day_master),
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

    def _luck_cycles(
        self,
        base_year: int,
        pillars: dict,
        gender: str,
        luck_start: dict,
    ) -> list[dict]:
        day_stem = pillars["day"]["stem"]
        month_pillar = pillars["month"]
        direction = self._luck_direction(pillars["year"]["stem"], gender)
        month_index = jiazi_index(month_pillar["stem"], month_pillar["branch"]) or 0
        current_age = self._nominal_age(base_year)
        first_start_age = luck_start["startAge"]
        cycles = []
        for index in range(8):
            step = index + 1 if direction == "forward" else -(index + 1)
            jiazi = (month_index + step) % 60
            stem = HEAVENLY_STEMS[jiazi % 10]
            branch = EARTHLY_BRANCHES[jiazi % 12]
            start_age = first_start_age + index * 10
            end_age = start_age + 9
            start_year = base_year + start_age - 1
            cycles.append(
                {
                    "index": index + 1,
                    "startYear": start_year,
                    "endYear": start_year + 9,
                    "startAge": start_age,
                    "endAge": end_age,
                    "stem": stem,
                    "branch": branch,
                    "tenGodStem": TEN_GODS_BY_DAY_STEM[day_stem][stem],
                    "tenGodBranch": self._ten_god_for_branch(day_stem, branch),
                    "direction": direction,
                    "directionText": "顺行" if direction == "forward" else "逆行",
                    "isCurrent": start_age <= current_age <= end_age,
                }
            )
        return cycles

    def _annual_cycles(self, base_year: int, day_stem: str) -> list[dict]:
        current_year = datetime.now().year
        start = current_year - 5
        return [
            {
                "year": year,
                "age": self._nominal_age(base_year, year),
                "stem": HEAVENLY_STEMS[(year - 4) % 10],
                "branch": EARTHLY_BRANCHES[(year - 4) % 12],
                "tenGodStem": TEN_GODS_BY_DAY_STEM[day_stem][HEAVENLY_STEMS[(year - 4) % 10]],
                "tenGodBranch": self._ten_god_for_branch(
                    day_stem,
                    EARTHLY_BRANCHES[(year - 4) % 12],
                ),
                "isCurrent": year == current_year,
                "relationSummary": "",
            }
            for year in range(start, start + 11)
        ]

    def _monthly_cycles(self, year: int, day_stem: str) -> list[dict]:
        solar_terms = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"]
        term_months = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1]
        current_index = self._current_monthly_cycle_index(datetime.now())
        cycles = []
        for index, term in enumerate(solar_terms):
            stem = HEAVENLY_STEMS[(year + index) % 10]
            branch = EARTHLY_BRANCHES[(index + 2) % 12]
            month = term_months[index]
            term_year = year + 1 if month == 1 else year
            cycles.append(
                {
                    "index": index + 1,
                    "solarTerm": term,
                    "solarTermDate": f"{term_year}-{month:02d}-01",
                    "stem": stem,
                    "branch": branch,
                    "tenGodStem": TEN_GODS_BY_DAY_STEM[day_stem][stem],
                    "tenGodBranch": self._ten_god_for_branch(day_stem, branch),
                    "relationSummary": "",
                    "isCurrent": index == current_index,
                }
            )
        return cycles

    def _current_monthly_cycle_index(self, current_dt: datetime) -> int:
        if current_dt.month == 1:
            return 11
        return current_dt.month - 2

    def _daily_cycle(self, day_stem: str) -> dict:
        Solar, _ = self._load_lunar_python()
        today = datetime.now()
        lunar = Solar.fromYmd(today.year, today.month, today.day).getLunar()
        ganzhi = lunar.getDayInGanZhi()
        stem = ganzhi[0]
        branch = ganzhi[1]
        return {
            "date": today.strftime("%Y-%m-%d"),
            "stem": stem,
            "branch": branch,
            "tenGodStem": TEN_GODS_BY_DAY_STEM[day_stem][stem],
            "tenGodBranch": self._ten_god_for_branch(day_stem, branch),
            "relationSummary": "",
            "isCurrent": True,
        }

    def _luck_direction(self, year_stem: str, gender: str) -> str:
        is_yang_year = year_stem in {"甲", "丙", "戊", "庚", "壬"}
        is_male = gender == "male"
        return "forward" if is_yang_year == is_male else "backward"

    def _luck_start_from_jie(self, lunar, birth_dt: datetime, direction: str) -> dict:
        jie = lunar.getNextJie() if direction == "forward" else lunar.getPrevJie()
        jie_dt = self._solar_to_datetime(jie.getSolar(), birth_dt.tzinfo)
        delta = abs(jie_dt - birth_dt)
        total_days = delta.total_seconds() / 86400
        total_months = max(0, round(total_days * 4))
        years = total_months // 12
        months = total_months % 12
        start_age = max(1, years + (1 if months > 0 else 0))

        return {
            "direction": direction,
            "directionText": "顺行" if direction == "forward" else "逆行",
            "basisSolarTerm": jie.getName(),
            "basisSolarTermDateTime": jie_dt.isoformat(),
            "startAge": start_age,
            "startAgeYears": years,
            "startAgeMonths": months,
            "startAgeText": f"{years}岁{months}个月起运" if months else f"{years}岁起运",
            "isEstimated": False,
        }

    def _manual_luck_start(self, year_stem: str, gender: str) -> dict:
        direction = self._luck_direction(year_stem, gender)
        return {
            "direction": direction,
            "directionText": "顺行" if direction == "forward" else "逆行",
            "basisSolarTerm": None,
            "basisSolarTermDateTime": None,
            "startAge": 1,
            "startAgeYears": 1,
            "startAgeMonths": 0,
            "startAgeText": "1岁起运（手动四柱未提供出生日期，暂按估算）",
            "isEstimated": True,
        }

    def _solar_to_datetime(self, solar, tzinfo) -> datetime:
        return datetime(
            solar.getYear(),
            solar.getMonth(),
            solar.getDay(),
            solar.getHour(),
            solar.getMinute(),
            solar.getSecond(),
            tzinfo=tzinfo,
        )

    def _ten_god_for_branch(self, day_stem: str, branch: str) -> str:
        hidden_stems = BRANCH_HIDDEN_STEMS[branch]
        return TEN_GODS_BY_DAY_STEM[day_stem][hidden_stems[0]]

    def _nominal_age(self, birth_year: int, target_year: int | None = None) -> int:
        year = target_year or datetime.now().year
        return max(1, year - birth_year + 1)

    def _load_lunar_python(self):
        try:
            from lunar_python import Lunar, Solar
        except ImportError as exc:
            raise ChartCalculationError(
                "CHART_CALCULATION_ERROR",
                "缺少 lunar-python 依赖，无法进行公历/农历排盘。请先安装后端依赖。",
            ) from exc
        return Solar, Lunar
