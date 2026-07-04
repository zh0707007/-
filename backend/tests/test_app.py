from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_geo_search_scaffold_response():
    response = client.get("/api/geo/search", params={"keyword": "北京"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"][0]["name"] == "北京市"
    assert payload["requestId"].startswith("req_")


def test_manual_chart_calculation():
    response = client.post(
        "/api/chart/calculate",
        json={
            "inputMode": "manual",
            "birthInput": None,
            "manualBaziInput": {
                "name": "张三",
                "gender": "male",
                "yearPillar": "己巳",
                "monthPillar": "丙子",
                "dayPillar": "丙寅",
                "hourPillar": "戊子",
                "unknownBirthHour": False,
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["pillars"]["day"]["tenGod"] == "日主"
    assert payload["data"]["pillars"]["hour"]["stem"] == "戊"
    assert payload["data"]["requestId"].startswith("req_")


def test_invalid_manual_pillar():
    response = client.post(
        "/api/chart/calculate",
        json={
            "inputMode": "manual",
            "manualBaziInput": {
                "name": "张三",
                "gender": "male",
                "yearPillar": "错误",
                "monthPillar": "丙子",
                "dayPillar": "丙寅",
                "unknownBirthHour": True,
            },
        },
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "INVALID_PILLAR"


def test_solar_chart_calculation():
    response = client.post(
        "/api/chart/calculate",
        json={
            "inputMode": "solar",
            "birthInput": {
                "name": "张三",
                "gender": "male",
                "calendarType": "solar",
                "birthDateTime": "1990-01-01T00:00:00+08:00",
                "isLeapMonth": False,
                "birthPlace": {
                    "province": "北京市",
                    "city": "北京市",
                    "latitude": 39.9042,
                    "longitude": 116.4074,
                    "timezone": "Asia/Shanghai",
                },
                "unknownBirthHour": False,
            },
            "manualBaziInput": None,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["pillars"]["year"]["stem"] == "己"
    assert payload["data"]["pillars"]["month"]["stem"] == "丙"
    assert payload["data"]["pillars"]["day"]["stem"] == "丙"
    assert payload["data"]["pillars"]["hour"]["branch"] == "子"
    assert payload["data"]["profile"]["trueSolarTime"]


def test_lunar_chart_calculation():
    response = client.post(
        "/api/chart/calculate",
        json={
            "inputMode": "lunar",
            "birthInput": {
                "name": "张三",
                "gender": "male",
                "calendarType": "lunar",
                "birthDateTime": "1989-12-05T00:00:00+08:00",
                "isLeapMonth": False,
                "birthPlace": {
                    "province": "北京市",
                    "city": "北京市",
                    "latitude": 39.9042,
                    "longitude": 116.4074,
                    "timezone": "Asia/Shanghai",
                },
                "unknownBirthHour": False,
            },
            "manualBaziInput": None,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["profile"]["solarDateTime"].startswith("1990-01-01")
    assert payload["data"]["pillars"]["day"]["tenGod"] == "日主"


def test_unknown_birth_hour_omits_hour_pillar():
    response = client.post(
        "/api/chart/calculate",
        json={
            "inputMode": "manual",
            "manualBaziInput": {
                "name": "张三",
                "gender": "male",
                "yearPillar": "己巳",
                "monthPillar": "丙子",
                "dayPillar": "丙寅",
                "unknownBirthHour": True,
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["pillars"]["hour"] is None
    assert "未知时辰" in payload["data"]["warnings"][0]


def test_analysis_generation_falls_back_without_llm_config():
    chart = _create_manual_chart()

    response = client.post(
        "/api/analysis/generate",
        json={
            "chartId": chart["chartId"],
            "analysisOptions": {
                "includeCareer": True,
                "includeWealth": True,
                "includeRelationship": True,
                "includeHealth": True,
                "includeHistoryCalibration": False,
                "yearsToLookAhead": 3,
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["chartId"] == chart["chartId"]
    assert payload["data"]["status"] == "fallback"
    assert payload["data"]["analysisId"].startswith("analysis_")
    assert "传统文化" in payload["data"]["disclaimer"]


def test_pdf_report_generation_and_download():
    chart = _create_manual_chart()
    analysis_response = client.post(
        "/api/analysis/generate",
        json={"chartId": chart["chartId"], "analysisOptions": {}},
    )
    analysis = analysis_response.json()["data"]

    response = client.post(
        "/api/report/pdf",
        json={"chartId": chart["chartId"], "analysisId": analysis["analysisId"]},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "ready"
    assert payload["data"]["downloadUrl"].startswith("/api/report/download/")

    download_response = client.get(payload["data"]["downloadUrl"])
    assert download_response.status_code == 200
    assert download_response.headers["content-type"] == "application/pdf"
    assert download_response.content.startswith(b"%PDF")


def test_analysis_chart_not_found():
    response = client.post(
        "/api/analysis/generate",
        json={"chartId": "chart_missing", "analysisOptions": {}},
    )

    assert response.status_code == 404
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "CHART_NOT_FOUND"


def _create_manual_chart() -> dict:
    response = client.post(
        "/api/chart/calculate",
        json={
            "inputMode": "manual",
            "birthInput": None,
            "manualBaziInput": {
                "name": "张三",
                "gender": "male",
                "yearPillar": "己巳",
                "monthPillar": "丙子",
                "dayPillar": "丙寅",
                "hourPillar": "戊子",
                "unknownBirthHour": False,
            },
        },
    )
    assert response.status_code == 200
    return response.json()["data"]
