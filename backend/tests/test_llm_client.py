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
