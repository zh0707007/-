from typing import Literal

from pydantic import BaseModel, Field


class BirthPlace(BaseModel):
    province: str
    city: str
    district: str | None = None
    latitude: float
    longitude: float
    timezone: str = "Asia/Shanghai"


class BirthInput(BaseModel):
    name: str = Field(min_length=1, max_length=30)
    gender: Literal["male", "female"]
    calendar_type: Literal["solar", "lunar"] = Field(alias="calendarType")
    birth_date_time: str = Field(alias="birthDateTime")
    is_leap_month: bool = Field(default=False, alias="isLeapMonth")
    birth_place: BirthPlace = Field(alias="birthPlace")
    unknown_birth_hour: bool = Field(default=False, alias="unknownBirthHour")

    model_config = {"populate_by_name": True}


class ManualBaziInput(BaseModel):
    name: str = Field(min_length=1, max_length=30)
    gender: Literal["male", "female"]
    year_pillar: str = Field(alias="yearPillar")
    month_pillar: str = Field(alias="monthPillar")
    day_pillar: str = Field(alias="dayPillar")
    hour_pillar: str | None = Field(default=None, alias="hourPillar")
    unknown_birth_hour: bool = Field(default=False, alias="unknownBirthHour")

    model_config = {"populate_by_name": True}


class ChartCalculateRequest(BaseModel):
    input_mode: Literal["solar", "lunar", "manual"] = Field(alias="inputMode")
    birth_input: BirthInput | None = Field(default=None, alias="birthInput")
    manual_bazi_input: ManualBaziInput | None = Field(default=None, alias="manualBaziInput")

    model_config = {"populate_by_name": True}
