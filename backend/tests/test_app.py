from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.db.session import SessionLocal, init_db
from app.main import app
from app.models.report import PdfReport
from app.api.routes import analysis as analysis_route


client = TestClient(app)


def test_geo_search_scaffold_response():
    response = client.get("/api/geo/search", params={"keyword": "北京"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"][0]["name"] == "北京市"
    assert payload["requestId"].startswith("req_")


def test_geo_search_rejects_empty_keyword():
    response = client.get("/api/geo/search", params={"keyword": ""})

    assert response.status_code == 422
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "VALIDATION_ERROR"
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
    assert payload["data"]["luckStart"]["isEstimated"] is True
    assert payload["data"]["luckCycles"][0]["directionText"] == "逆行"
    assert payload["data"]["luckCycles"][0]["tenGodStem"] == "正印"
    assert payload["data"]["annualCycles"][5]["age"]
    assert payload["data"]["annualCycles"][5]["tenGodStem"]
    assert payload["data"]["monthlyCycles"][0]["tenGodStem"]
    assert all("-13-" not in item["solarTermDate"] for item in payload["data"]["monthlyCycles"])
    assert sum(1 for item in payload["data"]["monthlyCycles"] if item["isCurrent"]) == 1
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


def test_chart_request_validation_uses_unified_response():
    response = client.post(
        "/api/chart/calculate",
        json={
            "inputMode": "solar",
            "birthInput": {
                "name": "",
                "gender": "male",
                "calendarType": "solar",
                "birthDateTime": "1990-01-01T00:00:00+08:00",
                "birthPlace": {
                    "province": "北京市",
                    "city": "北京市",
                    "latitude": 39.9042,
                    "longitude": 116.4074,
                    "timezone": "Asia/Shanghai",
                },
            },
        },
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "VALIDATION_ERROR"
    assert payload["error"]["details"]["errors"]
    assert payload["requestId"].startswith("req_")


def test_solar_calendar_convert_error():
    response = client.post(
        "/api/chart/calculate",
        json={
            "inputMode": "solar",
            "birthInput": {
                "name": "张三",
                "gender": "male",
                "calendarType": "solar",
                "birthDateTime": "not-a-date",
                "birthPlace": {
                    "province": "北京市",
                    "city": "北京市",
                    "latitude": 39.9042,
                    "longitude": 116.4074,
                    "timezone": "Asia/Shanghai",
                },
            },
        },
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "CALENDAR_CONVERT_ERROR"


def test_lunar_calendar_convert_error():
    response = client.post(
        "/api/chart/calculate",
        json={
            "inputMode": "lunar",
            "birthInput": {
                "name": "张三",
                "gender": "male",
                "calendarType": "lunar",
                "birthDateTime": "1989-13-40T00:00:00+08:00",
                "birthPlace": {
                    "province": "北京市",
                    "city": "北京市",
                    "latitude": 39.9042,
                    "longitude": 116.4074,
                    "timezone": "Asia/Shanghai",
                },
            },
        },
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "CALENDAR_CONVERT_ERROR"


def test_get_chart_by_id():
    chart = _create_manual_chart()

    response = client.get(f"/api/chart/{chart['chartId']}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["chartId"] == chart["chartId"]
    assert payload["data"]["pillars"]["day"]["tenGod"] == "日主"


def test_get_chart_not_found():
    response = client.get("/api/chart/chart_missing")

    assert response.status_code == 404
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "CHART_NOT_FOUND"


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
    assert payload["data"]["luckStart"]["isEstimated"] is False
    assert payload["data"]["luckStart"]["basisSolarTerm"]
    assert payload["data"]["luckCycles"][0]["startAge"] == payload["data"]["luckStart"]["startAge"]


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


def test_analysis_generation_falls_back_on_llm_timeout(monkeypatch):
    chart = _create_manual_chart()

    monkeypatch.setattr(analysis_route.llm_client, "_is_configured", lambda: True)

    def raise_timeout(chart, options):
        raise TimeoutError("simulated timeout")

    monkeypatch.setattr(analysis_route.llm_client, "_generate_with_openai", raise_timeout)

    response = client.post(
        "/api/analysis/generate",
        json={"chartId": chart["chartId"], "analysisOptions": {}},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "fallback"
    assert "超时" in payload["data"]["warnings"][0]


def test_get_analysis_by_id_and_latest_for_chart():
    chart = _create_manual_chart()
    analysis_response = client.post(
        "/api/analysis/generate",
        json={"chartId": chart["chartId"], "analysisOptions": {}},
    )
    analysis = analysis_response.json()["data"]

    by_id_response = client.get(f"/api/analysis/{analysis['analysisId']}")
    latest_response = client.get(f"/api/analysis/chart/{chart['chartId']}/latest")

    assert by_id_response.status_code == 200
    assert latest_response.status_code == 200
    assert by_id_response.json()["data"]["analysisId"] == analysis["analysisId"]
    assert latest_response.json()["data"]["analysisId"] == analysis["analysisId"]


def test_get_analysis_not_found():
    response = client.get("/api/analysis/analysis_missing")

    assert response.status_code == 404
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "ANALYSIS_NOT_FOUND"


def test_pdf_report_generation_and_download():
    chart, analysis, response = _create_pdf_report()

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "ready"
    assert payload["data"]["downloadUrl"].startswith("/api/report/download/")

    download_response = client.get(payload["data"]["downloadUrl"])
    assert download_response.status_code == 200
    assert download_response.headers["content-type"] == "application/pdf"
    assert download_response.content.startswith(b"%PDF")
    assert payload["data"]["chartId"] == chart["chartId"]
    assert payload["data"]["analysisId"] == analysis["analysisId"]


def test_get_pdf_report_by_id_and_latest_for_chart():
    chart, analysis, report_response = _create_pdf_report()
    report = report_response.json()["data"]

    by_id_response = client.get(f"/api/report/{report['reportId']}")
    latest_response = client.get(f"/api/report/chart/{chart['chartId']}/latest")

    assert by_id_response.status_code == 200
    assert latest_response.status_code == 200
    assert by_id_response.json()["data"]["reportId"] == report["reportId"]
    assert latest_response.json()["data"]["analysisId"] == analysis["analysisId"]
    assert "filePath" not in by_id_response.json()["data"]


def test_pdf_report_generation_with_chart_warnings():
    chart = _create_manual_chart(unknown_birth_hour=True)
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


def test_pdf_download_report_not_found():
    response = client.get("/api/report/download/report_missing")

    assert response.status_code == 404
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "REPORT_NOT_FOUND"


def test_pdf_download_report_expired():
    _insert_report_record(
        report_id="report_expired_for_test",
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )

    response = client.get("/api/report/download/report_expired_for_test")

    assert response.status_code == 410
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "REPORT_EXPIRED"


def test_pdf_download_missing_file_returns_storage_error():
    _insert_report_record(
        report_id="report_missing_file_for_test",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )

    response = client.get("/api/report/download/report_missing_file_for_test")

    assert response.status_code == 500
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "REPORT_STORAGE_ERROR"


def test_analysis_chart_not_found():
    response = client.post(
        "/api/analysis/generate",
        json={"chartId": "chart_missing", "analysisOptions": {}},
    )

    assert response.status_code == 404
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"]["code"] == "CHART_NOT_FOUND"


def _create_manual_chart(unknown_birth_hour: bool = False) -> dict:
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
                "hourPillar": None if unknown_birth_hour else "戊子",
                "unknownBirthHour": unknown_birth_hour,
            },
        },
    )
    assert response.status_code == 200
    return response.json()["data"]


def _create_pdf_report() -> tuple[dict, dict, object]:
    chart = _create_manual_chart()
    analysis_response = client.post(
        "/api/analysis/generate",
        json={"chartId": chart["chartId"], "analysisOptions": {}},
    )
    analysis = analysis_response.json()["data"]
    report_response = client.post(
        "/api/report/pdf",
        json={"chartId": chart["chartId"], "analysisId": analysis["analysisId"]},
    )
    return chart, analysis, report_response


def _insert_report_record(report_id: str, expires_at: datetime) -> None:
    init_db()
    db = SessionLocal()
    try:
        existing = db.get(PdfReport, report_id)
        if existing:
            db.delete(existing)
            db.commit()
        db.add(
            PdfReport(
                id=report_id,
                chart_id="chart_test",
                analysis_id="analysis_test",
                file_name=f"{report_id}.pdf",
                file_path=f"reports/{report_id}.pdf",
                download_url=f"/api/report/download/{report_id}",
                status="ready",
                expires_at=expires_at,
            )
        )
        db.commit()
    finally:
        db.close()
