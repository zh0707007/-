import json
from uuid import uuid4

from app.core.config import settings
from app.schemas.analysis import AnalysisOptions


DISCLAIMER = (
    "本报告内容仅供传统文化研究与娱乐参考，不构成健康、法律、财务、投资、婚恋等"
    "专业建议；重要决策请结合现实情况并咨询相应专业人士。"
)


class LlmClient:
    """OpenAI-compatible analysis generator with deterministic local fallback."""

    def generate(self, chart: dict, options: AnalysisOptions) -> dict:
        if not self._is_configured():
            return self._fallback_analysis(chart, options, warning="LLM 未配置，已生成本地摘要解读")

        try:
            return self._generate_with_openai(chart, options)
        except Exception:
            return self._fallback_analysis(chart, options, warning="LLM 调用失败，已保留命盘并生成本地摘要解读")

    def _is_configured(self) -> bool:
        return bool(
            settings.llm_api_key
            and settings.llm_model
            and settings.llm_api_key != "replace-with-real-key"
            and settings.llm_model != "replace-with-model-name"
        )

    def _generate_with_openai(self, chart: dict, options: AnalysisOptions) -> dict:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout=settings.llm_timeout_seconds,
        )
        response = client.chat.completions.create(
            model=settings.llm_model,
            temperature=0.4,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是命理报告撰写助手。你只能基于后端提供的标准命盘写解读，"
                        "不得重新计算四柱，不得给出绝对化承诺。输出 JSON。"
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "chart": chart,
                            "options": options.model_dump(mode="json", by_alias=True),
                            "requiredKeys": [
                                "summary",
                                "sections",
                                "imagePromptSummary",
                            ],
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
        )
        content = response.choices[0].message.content or "{}"
        parsed = json.loads(content)
        return self._normalize_result(
            chart=chart,
            model_name=settings.llm_model,
            status="completed",
            summary=parsed.get("summary", ""),
            sections=parsed.get("sections", []),
            image_prompt_summary=parsed.get("imagePromptSummary", ""),
            warnings=[],
        )

    def _fallback_analysis(self, chart: dict, options: AnalysisOptions, warning: str) -> dict:
        pillars = chart["pillars"]
        stats = chart.get("fiveElementStats", {})
        strongest = max(stats, key=stats.get) if stats else "未知"
        weakest = min(stats, key=stats.get) if stats else "未知"
        hour_text = (
            f'{pillars["hour"]["stem"]}{pillars["hour"]["branch"]}'
            if pillars.get("hour")
            else "未知时辰"
        )

        sections = [
            {
                "title": "命盘概览",
                "content": (
                    f'四柱为 {pillars["year"]["stem"]}{pillars["year"]["branch"]}、'
                    f'{pillars["month"]["stem"]}{pillars["month"]["branch"]}、'
                    f'{pillars["day"]["stem"]}{pillars["day"]["branch"]}、{hour_text}。'
                    f'日主为 {chart["dayMaster"]}，五行计数中{strongest}相对突出，'
                    f'{weakest}相对不足。'
                ),
            },
            {
                "title": "性格与优势",
                "content": (
                    "本地摘要仅根据排盘结构生成，用于开发联调。正式解读会结合十神、"
                    "藏干、大运和流年写出更完整的分层分析。"
                ),
            },
            {
                "title": "阶段提示",
                "content": (
                    f"已生成 {len(chart.get('luckCycles', []))} 组大运、"
                    f"{len(chart.get('annualCycles', []))} 组流年和"
                    f"{len(chart.get('monthlyCycles', []))} 组流月，前端可据此展示当前项高亮。"
                ),
            },
        ]
        if options.include_health:
            sections.append(
                {
                    "title": "身心提示",
                    "content": "健康相关内容仅适合做生活节奏提醒，不用于诊断、治疗或替代医生建议。",
                }
            )

        return self._normalize_result(
            chart=chart,
            model_name=None,
            status="fallback",
            summary=f"{chart['profile']['name']} 的命盘已完成排盘，本次返回本地摘要解读。",
            sections=sections,
            image_prompt_summary=f"以日主 {chart['dayMaster']} 和五行结构为主题的东方传统文化人物意象摘要。",
            warnings=[warning, *chart.get("warnings", [])],
        )

    def _normalize_result(
        self,
        chart: dict,
        model_name: str | None,
        status: str,
        summary: str,
        sections: list,
        image_prompt_summary: str,
        warnings: list[str],
    ) -> dict:
        normalized_sections = [
            {
                "title": str(section.get("title", "综合解读")),
                "content": str(section.get("content", "")),
            }
            for section in sections
            if isinstance(section, dict)
        ]
        if not normalized_sections:
            normalized_sections = [{"title": "综合解读", "content": summary or "解读内容生成完成。"}]

        return {
            "analysisId": f"analysis_{uuid4().hex}",
            "chartId": chart["chartId"],
            "status": status,
            "modelName": model_name,
            "summary": summary or normalized_sections[0]["content"],
            "sections": normalized_sections,
            "imagePromptSummary": image_prompt_summary,
            "disclaimer": DISCLAIMER,
            "warnings": warnings,
        }
