import json
import re
from uuid import uuid4

from app.core.config import settings
from app.schemas.analysis import AnalysisOptions
from app.services.llm.topics import get_topic_definition


DISCLAIMER = (
    "本报告内容仅供传统文化研究与娱乐参考，不构成健康、法律、财务、投资、婚恋等"
    "专业建议；重要决策请结合现实情况并咨询相应专业人士。"
)
REQUIRED_SECTION_TITLES = [
    "一、身强/弱分析",
    "二、用神分析与排序",
    "三、十神分析",
    "四、性格特征",
    "五、事业方向",
    "六、个人财富",
    "七、婚姻感情",
    "八、身体健康",
    "九、适合发展的城市",
    "十、当前大运与流年总论",
]


class LlmClient:
    """OpenAI-compatible analysis generator with deterministic local fallback."""

    def generate(self, chart: dict, options: AnalysisOptions) -> dict:
        configuration_warning = self._configuration_warning()
        if configuration_warning:
            return self._fallback_analysis(chart, options, warning=configuration_warning)

        try:
            return self._generate_with_openai(chart, options)
        except Exception as exc:
            if self._is_timeout_error(exc):
                warning = "LLM 调用超时，已保留命盘并生成本地摘要解读"
            else:
                warning = (
                    f"LLM 调用失败（{self._provider_error_hint(exc)}），"
                    "已保留命盘并生成本地摘要解读"
                )
            return self._fallback_analysis(chart, options, warning=warning)

    def _is_configured(self) -> bool:
        return self._configuration_warning() is None

    def _configuration_warning(self) -> str | None:
        placeholder_keys = {
            "replace-with-real-key",
            "replace-with-your-real-api-key",
            "replace-with-your-openai-api-key",
            "replace-with-your-deepseek-api-key",
            "your-openai-api-key",
        }
        placeholder_models = {
            "replace-with-model-name",
            "replace-with-your-model-name",
        }
        api_key = (settings.llm_api_key or "").strip()
        model = (settings.llm_model or "").strip()
        base_url = (settings.llm_base_url or "").strip().lower()

        if not api_key or api_key in placeholder_keys:
            return "LLM 未配置 API Key，已生成本地摘要解读"
        if not model or model in placeholder_models:
            return "LLM 未配置模型名称，已生成本地摘要解读"
        if "api.openai.com" in base_url and not api_key.startswith("sk-"):
            return "OpenAI API Key 格式不正确，应以 sk- 或 sk-proj- 开头，已生成本地摘要解读"
        return None

    def _is_timeout_error(self, exc: Exception) -> bool:
        return isinstance(exc, TimeoutError) or exc.__class__.__name__ in {
            "APITimeoutError",
            "TimeoutException",
            "ReadTimeout",
        }

    def _provider_error_hint(self, exc: Exception) -> str:
        error_code = str(getattr(exc, "code", "") or "").lower()
        status_code = getattr(exc, "status_code", None)
        message = str(exc).lower()
        error_name = exc.__class__.__name__

        if status_code in {401, 403} or "authentication" in message or "api key" in message:
            return "API Key 无效或无权限"
        if status_code == 404 or "model_not_found" in error_code or "model" in message:
            return "模型名称不可用或账号无模型权限"
        if status_code == 429 or "rate_limit" in error_code or "quota" in message:
            return "额度不足或请求频率受限"
        if status_code and status_code >= 500:
            return "模型服务暂时不可用"
        if isinstance(exc, ValueError):
            if exc.__class__.__name__ == "JSONDecodeError":
                return "模型返回 JSON 格式不完整"
            return "模型返回章节不完整"
        return error_name

    def _provider_extra_body(self) -> dict | None:
        base_url = (settings.llm_base_url or "").lower()
        if "deepseek.com" in base_url:
            return {"thinking": {"type": "disabled"}}
        return None

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
            response_format={"type": "json_object"},
            extra_body=self._provider_extra_body(),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是命理报告撰写助手。你只能基于后端提供的标准命盘写解读，"
                        "不得重新计算四柱，不得给出绝对化承诺。必须输出 JSON。"
                        "sections 必须严格包含十个章节，标题和顺序必须与用户消息里的"
                        "requiredSectionTitles 完全一致，每节内容不得为空，不得写待生成、"
                        "暂无、略、占位。"
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
                            "requiredSectionTitles": REQUIRED_SECTION_TITLES,
                            "sectionRules": (
                                "sections 长度必须为 10；每个 section 为 {title, content}；"
                                "content 使用中文完整段落；二至九节每节至少 260 个中文字符，"
                                "一节与十节每节至少 180 个中文字符；"
                                "用神分析需给出排序和取用理由；十神分析需覆盖透干、藏干、组合结构；"
                                "性格、事业、财富、婚恋、健康、城市章节需结合原局、大运、流年给出分层分析；"
                                "健康、财务、婚恋等内容必须中性表达并避免替用户做专业决策。"
                            ),
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
        )
        content = response.choices[0].message.content or "{}"
        parsed = self._parse_json_content(content)
        sections = parsed.get("sections", [])
        self._validate_required_sections(sections)
        return self._normalize_result(
            chart=chart,
            model_name=settings.llm_model,
            status="completed",
            summary=parsed.get("summary", ""),
            sections=sections,
            image_prompt_summary=parsed.get("imagePromptSummary", ""),
            warnings=self._section_detail_warnings(sections),
        )

    def generate_topic(self, chart: dict, topic_slug: str, base_analysis: dict | None = None) -> dict:
        topic = get_topic_definition(topic_slug)
        if topic is None:
            raise ValueError("invalid topic")

        configuration_warning = self._configuration_warning()
        if configuration_warning:
            return self._fallback_topic_analysis(chart, topic_slug, topic, configuration_warning)

        try:
            return self._generate_topic_with_openai(chart, topic_slug, topic, base_analysis)
        except Exception as exc:
            if self._is_timeout_error(exc):
                warning = "专题大模型调用超时，已保留命盘但未生成正式专题解读"
            else:
                warning = f"专题大模型调用失败（{self._provider_error_hint(exc)}），已保留命盘但未生成正式专题解读"
            return self._fallback_topic_analysis(chart, topic_slug, topic, warning)

    def _generate_topic_with_openai(
        self,
        chart: dict,
        topic_slug: str,
        topic: dict,
        base_analysis: dict | None,
    ) -> dict:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            timeout=settings.llm_timeout_seconds,
        )
        response = client.chat.completions.create(
            model=settings.llm_model,
            temperature=0.35,
            response_format={"type": "json_object"},
            extra_body=self._provider_extra_body(),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是八字专题报告撰写助手。只能基于后端提供的标准命盘和已有总解读写专题，"
                        "不得重新计算四柱，不得给出绝对化承诺。必须输出 JSON。"
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "chart": chart,
                            "baseAnalysis": base_analysis,
                            "topic": topic,
                            "requiredJsonShape": {
                                "summary": "80-140字专题总览",
                                "keyPoints": ["3-6条可放入PDF的重点"],
                                "sections": [
                                    {
                                        "title": "小标题",
                                        "content": "完整段落，每段至少120个中文字符",
                                    }
                                ],
                                "pdfExcerpt": "120-220字PDF摘要",
                            },
                            "rules": (
                                "sections 至少 4 节，总正文至少 800 个中文字符；"
                                "必须结合原局、大运、流年或流月；"
                                "健康、财务、婚恋等内容必须中性表达，不替用户做专业决策。"
                            ),
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
        )
        parsed = self._parse_json_content(response.choices[0].message.content or "{}")
        return self._normalize_topic_result(
            chart=chart,
            topic_slug=topic_slug,
            topic=topic,
            model_name=settings.llm_model,
            status="completed",
            summary=parsed.get("summary", ""),
            key_points=parsed.get("keyPoints", []),
            sections=parsed.get("sections", []),
            pdf_excerpt=parsed.get("pdfExcerpt", ""),
            warnings=[],
        )

    def _validate_required_sections(self, sections: list) -> None:
        if len(sections) < len(REQUIRED_SECTION_TITLES):
            raise ValueError("LLM sections missing required report chapters")
        for index, title in enumerate(REQUIRED_SECTION_TITLES):
            section = sections[index]
            if not isinstance(section, dict):
                raise ValueError("LLM section must be an object")
            content = str(section.get("content", "")).strip()
            section_title = str(section.get("title", "")).strip()
            if section_title != title:
                raise ValueError("LLM section title does not match required report chapters")
            if not content or content in {"本节解读待生成。", "待生成", "暂无", "略"}:
                raise ValueError("LLM section content is empty or placeholder")

    def _section_detail_warnings(self, sections: list) -> list[str]:
        short_titles = []
        for index, title in enumerate(REQUIRED_SECTION_TITLES):
            if index >= len(sections):
                continue
            content = str(sections[index].get("content", "")).strip()
            min_length = 180 if index in {0, 9} else 260
            if self._visible_text_length(content) < min_length:
                short_titles.append(title)
        if short_titles:
            return ["模型已返回 AI 解读，但部分章节篇幅偏短；可进入对应专题页生成更详细分析。"]
        return []

    def _visible_text_length(self, content: str) -> int:
        return len("".join(str(content).split()))

    def _parse_json_content(self, content: str) -> dict:
        stripped = content.strip()
        if stripped.startswith("```"):
            lines = stripped.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            stripped = "\n".join(lines).strip()

        if not stripped.startswith("{"):
            start = stripped.find("{")
            end = stripped.rfind("}")
            if start >= 0 and end > start:
                stripped = stripped[start : end + 1]

        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            parsed = json.loads(self._repair_json_content(stripped))
        return parsed if isinstance(parsed, dict) else {}

    def _repair_json_content(self, content: str) -> str:
        content_property = r'("content"\s*:\s*"(?:(?:\\.)|[^"\\])*")'
        next_property = r'(\]\s*,\s*"(?:imagePromptSummary|pdfExcerpt|disclaimer|warnings|keyPoints|summary)")'
        repaired = re.sub(
            content_property + r"\s*" + next_property,
            r"\1\n    }\n  \2",
            content,
            count=1,
            flags=re.DOTALL,
        )
        repaired = re.sub(
            content_property + r"\s*(\]\s*})",
            r"\1\n    }\n  \2",
            repaired,
            count=1,
            flags=re.DOTALL,
        )
        return repaired

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

    def _fallback_topic_analysis(
        self,
        chart: dict,
        topic_slug: str,
        topic: dict,
        warning: str,
    ) -> dict:
        return self._normalize_topic_result(
            chart=chart,
            topic_slug=topic_slug,
            topic=topic,
            model_name=None,
            status="fallback",
            summary=f"{topic['title']}专题尚未生成正式大模型解读。",
            key_points=[],
            sections=[],
            pdf_excerpt="",
            warnings=[warning],
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

    def _normalize_topic_result(
        self,
        chart: dict,
        topic_slug: str,
        topic: dict,
        model_name: str | None,
        status: str,
        summary: str,
        key_points: list,
        sections: list,
        pdf_excerpt: str,
        warnings: list[str],
    ) -> dict:
        normalized_sections = [
            {
                "title": str(section.get("title", "专题分析")),
                "content": str(section.get("content", "")),
            }
            for section in sections
            if isinstance(section, dict)
        ]
        normalized_key_points = [str(item) for item in key_points if str(item).strip()]
        if status == "completed":
            self._validate_topic_result(summary, normalized_key_points, normalized_sections, pdf_excerpt)
            warnings = [*warnings, *self._topic_detail_warnings(normalized_sections)]

        return {
            "topicAnalysisId": f"topic_{uuid4().hex}",
            "chartId": chart["chartId"],
            "topicSlug": topic_slug,
            "title": topic["title"],
            "status": status,
            "modelName": model_name,
            "summary": summary or f"{topic['title']}专题解读已生成。",
            "keyPoints": normalized_key_points,
            "sections": normalized_sections,
            "pdfExcerpt": pdf_excerpt,
            "disclaimer": DISCLAIMER,
            "warnings": warnings,
        }

    def _validate_topic_result(
        self,
        summary: str,
        key_points: list[str],
        sections: list[dict],
        pdf_excerpt: str,
    ) -> None:
        if self._visible_text_length(summary) < 40:
            raise ValueError("topic summary is shorter than required")
        if len(key_points) < 3:
            raise ValueError("topic key points are missing")
        if len(sections) < 4:
            raise ValueError("topic sections are missing")
        if any(not str(section["content"]).strip() for section in sections):
            raise ValueError("topic section content is empty")
        if self._visible_text_length(pdf_excerpt) < 60:
            raise ValueError("topic PDF excerpt is missing")

    def _topic_detail_warnings(self, sections: list[dict]) -> list[str]:
        content_text = "".join(section["content"] for section in sections)
        if self._visible_text_length(content_text) < 800:
            return ["模型已返回专题解读，但本次专题正文篇幅偏短；可点击重新生成获得更详细版本。"]
        return []
