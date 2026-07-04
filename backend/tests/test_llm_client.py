from app.services.llm.client import DISCLAIMER, LlmClient


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
