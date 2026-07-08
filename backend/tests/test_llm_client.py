import pytest

from app.services.llm.client import DISCLAIMER, REQUIRED_SECTION_TITLES, LlmClient


def test_llm_result_normalization_fills_missing_sections():
    chart = {
        "chartId": "chart_test",
        "profile": {"name": "张三"},
    }

    result = LlmClient()._normalize_result(
        chart=chart,
        model_name="test-model",
        status="completed",
        summary="",
        sections=[],
        image_prompt_summary="",
        warnings=[],
    )

    assert result["chartId"] == "chart_test"
    assert result["modelName"] == "test-model"
    assert result["summary"] == "解读内容生成完成。"
    assert result["sections"] == [{"title": "综合解读", "content": "解读内容生成完成。"}]
    assert result["disclaimer"] == DISCLAIMER


def test_llm_json_parser_accepts_markdown_fence():
    parsed = LlmClient()._parse_json_content(
        '```json\n{"summary": "完成", "sections": []}\n```'
    )

    assert parsed["summary"] == "完成"


def test_llm_json_parser_extracts_object_from_text():
    parsed = LlmClient()._parse_json_content(
        '以下是结果：{"summary": "完成", "imagePromptSummary": "画像"}'
    )

    assert parsed["imagePromptSummary"] == "画像"


def test_llm_json_parser_repairs_missing_last_section_brace():
    parsed = LlmClient()._parse_json_content(
        """
{
  "summary": "完成",
  "sections": [
    {
      "title": "一、身强/弱分析",
      "content": "章节内容"
    },
    {
      "title": "十、当前大运与流年总论",
      "content": "最后一节内容"
  ],
  "imagePromptSummary": "画像"
}
"""
    )

    assert parsed["sections"][1]["content"] == "最后一节内容"
    assert parsed["imagePromptSummary"] == "画像"


def test_llm_provider_error_hint_for_missing_model():
    class MissingModelError(Exception):
        status_code = 404
        code = "model_not_found"

    hint = LlmClient()._provider_error_hint(MissingModelError("model not found"))

    assert hint == "模型名称不可用或账号无模型权限"


def test_llm_configuration_warning_for_invalid_openai_key(monkeypatch):
    from app.services.llm import client as llm_module

    monkeypatch.setattr(llm_module.settings, "llm_base_url", "https://api.openai.com/v1")
    monkeypatch.setattr(llm_module.settings, "llm_api_key", "sq-not-an-openai-key")
    monkeypatch.setattr(llm_module.settings, "llm_model", "gpt-5.5")

    warning = LlmClient()._configuration_warning()

    assert warning is not None
    assert "格式不正确" in warning


def test_llm_validate_required_sections_rejects_missing_chapters():
    with pytest.raises(ValueError):
        LlmClient()._validate_required_sections(
            [{"title": REQUIRED_SECTION_TITLES[0], "content": "完整内容"}]
        )


def test_llm_validate_required_sections_accepts_full_chapters():
    sections = [
        {
            "title": title,
            "content": "这是一段完整的大模型章节解读内容。" * 30,
        }
        for title in REQUIRED_SECTION_TITLES
    ]

    LlmClient()._validate_required_sections(sections)


def test_llm_validate_required_sections_accepts_short_model_content_with_warning():
    sections = [{"title": title, "content": "内容太短"} for title in REQUIRED_SECTION_TITLES]

    client = LlmClient()
    client._validate_required_sections(sections)

    assert client._section_detail_warnings(sections)
