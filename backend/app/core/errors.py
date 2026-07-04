from enum import StrEnum


class ErrorCode(StrEnum):
    validation_error = "VALIDATION_ERROR"
    invalid_pillar = "INVALID_PILLAR"
    geo_not_found = "GEO_NOT_FOUND"
    geo_provider_error = "GEO_PROVIDER_ERROR"
    calendar_convert_error = "CALENDAR_CONVERT_ERROR"
    chart_calculation_error = "CHART_CALCULATION_ERROR"
    chart_not_found = "CHART_NOT_FOUND"
    llm_timeout = "LLM_TIMEOUT"
    llm_provider_error = "LLM_PROVIDER_ERROR"
    analysis_generation_error = "ANALYSIS_GENERATION_ERROR"
    analysis_not_found = "ANALYSIS_NOT_FOUND"
    ai_analysis_required = "AI_ANALYSIS_REQUIRED"
    pdf_render_error = "PDF_RENDER_ERROR"
    report_not_found = "REPORT_NOT_FOUND"
    report_expired = "REPORT_EXPIRED"
    report_storage_error = "REPORT_STORAGE_ERROR"
