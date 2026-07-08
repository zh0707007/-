from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.pdfmetrics import registerFont
from reportlab.platypus import Flowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.config import settings
from app.services.llm.topics import TOPIC_DEFINITIONS


ELEMENT_COLORS = {
    "木": "#2f9d55",
    "火": "#c9231f",
    "土": "#9a741a",
    "金": "#b6922e",
    "水": "#2374bd",
}
STEM_ELEMENTS = {
    "甲": "木",
    "乙": "木",
    "丙": "火",
    "丁": "火",
    "戊": "土",
    "己": "土",
    "庚": "金",
    "辛": "金",
    "壬": "水",
    "癸": "水",
}
BRANCH_ELEMENTS = {
    "寅": "木",
    "卯": "木",
    "巳": "火",
    "午": "火",
    "辰": "土",
    "戌": "土",
    "丑": "土",
    "未": "土",
    "申": "金",
    "酉": "金",
    "亥": "水",
    "子": "水",
}
SECTION_TITLES = [
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


class BaziPortraitFlowable(Flowable):
    """A deterministic chart portrait generated from the user's pillars and elements."""

    def __init__(self, chart: dict, analysis: dict, width: float, height: float):
        super().__init__()
        self.chart = chart
        self.analysis = analysis
        self.width = width
        self.height = height

    def draw(self):
        canvas = self.canv
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#3b2a18"))
        canvas.setLineWidth(1.2)
        canvas.setFillColor(colors.HexColor("#15120d"))
        canvas.rect(0, 0, self.width, self.height, fill=1, stroke=0)

        stats = self.chart.get("fiveElementStats", {})
        dominant = max(stats, key=stats.get) if stats else "土"
        weak = min(stats, key=stats.get) if stats else "水"
        dominant_color = colors.HexColor(ELEMENT_COLORS.get(dominant, "#9a741a"))
        weak_color = colors.HexColor(ELEMENT_COLORS.get(weak, "#2374bd"))

        # Sky and landscape blocks: fire/sun, earth mountain, water stream, wood tree.
        canvas.setFillColor(colors.HexColor("#21170d"))
        canvas.rect(0, self.height * 0.36, self.width, self.height * 0.64, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#0c2230"))
        canvas.rect(0, 0, self.width, self.height * 0.36, fill=1, stroke=0)
        canvas.setFillColor(dominant_color)
        canvas.circle(self.width * 0.5, self.height * 0.77, 30, fill=1, stroke=0)
        canvas.setFillColor(colors.Color(1, 0.86, 0.35, alpha=0.32))
        canvas.circle(self.width * 0.5, self.height * 0.77, 48, fill=1, stroke=0)

        canvas.setFillColor(colors.HexColor("#5f421d"))
        canvas.line(self.width * 0.15, self.height * 0.36, self.width * 0.42, self.height * 0.57)
        canvas.line(self.width * 0.42, self.height * 0.57, self.width * 0.68, self.height * 0.36)
        canvas.line(self.width * 0.68, self.height * 0.36, self.width * 0.88, self.height * 0.5)
        canvas.line(self.width * 0.88, self.height * 0.5, self.width, self.height * 0.36)
        canvas.setFillColor(colors.HexColor("#6f4f24"))
        canvas.rect(0, self.height * 0.23, self.width, self.height * 0.13, fill=1, stroke=0)

        canvas.setStrokeColor(weak_color)
        canvas.setLineWidth(4)
        for offset in (0, 10, 20):
            canvas.bezier(
                -10,
                self.height * 0.17 + offset,
                self.width * 0.27,
                self.height * 0.09 + offset,
                self.width * 0.58,
                self.height * 0.22 + offset,
                self.width + 10,
                self.height * 0.13 + offset,
            )

        canvas.setStrokeColor(colors.HexColor("#244f2b"))
        canvas.setLineWidth(8)
        canvas.line(self.width * 0.27, self.height * 0.23, self.width * 0.34, self.height * 0.48)
        canvas.setFillColor(colors.HexColor("#2d6d3b"))
        for x, y, r in [
            (0.26, 0.5, 30),
            (0.34, 0.54, 36),
            (0.42, 0.49, 28),
        ]:
            canvas.circle(self.width * x, self.height * y, r, fill=1, stroke=0)

        pillars = self._pillar_texts()
        canvas.setFont("STSong-Light", 16)
        canvas.setFillColor(colors.HexColor("#d9b36a"))
        canvas.drawCentredString(self.width * 0.5, self.height * 0.77 - 6, dominant)
        canvas.setFont("STSong-Light", 15)
        for index, text in enumerate(pillars):
            x = 22
            y = self.height - 44 - index * 28
            canvas.drawString(x, y, text)
        canvas.setFont("STSong-Light", 20)
        canvas.setFillColor(colors.HexColor("#ecd48f"))
        canvas.drawCentredString(self.width * 0.5, self.height * 0.31, self.chart.get("dayMaster", "日主"))

        # Caption parchment panel, similar to the sample first image.
        caption_h = 68
        canvas.setFillColor(colors.HexColor("#e7d4ac"))
        canvas.rect(0, 0, self.width, caption_h, fill=1, stroke=0)
        canvas.setStrokeColor(colors.HexColor("#8e7047"))
        canvas.rect(4, 4, self.width - 8, caption_h - 8, fill=0, stroke=1)
        canvas.setFillColor(colors.HexColor("#3e2a17"))
        canvas.setFont("STSong-Light", 12)
        canvas.drawCentredString(self.width / 2, 46, f"八字：{'  '.join(pillars)}")
        canvas.setFont("STSong-Light", 9)
        canvas.drawCentredString(
            self.width / 2,
            29,
            f"日主 {self.chart.get('dayMaster', '未知')}，{dominant}势较显，{weak}气需调。",
        )
        canvas.drawCentredString(
            self.width / 2,
            15,
            self._image_summary(),
        )
        canvas.restoreState()

    def _pillar_texts(self) -> list[str]:
        pillars = self.chart.get("pillars", {})
        texts = []
        for key in ["year", "month", "day", "hour"]:
            pillar = pillars.get(key)
            if pillar:
                texts.append(f"{pillar.get('stem', '')}{pillar.get('branch', '')}")
        return texts or ["未知"]

    def _image_summary(self) -> str:
        summary = str(self.analysis.get("imagePromptSummary") or "命局画像依据四柱、日主与五行强弱生成。")
        return summary[:34]


class PdfReportService:
    """Server-side PDF report renderer."""

    def render(self, chart: dict, analysis: dict, topic_analyses: list[dict] | None = None) -> dict:
        report_id = f"report_{uuid4().hex}"
        reports_dir = Path("reports")
        reports_dir.mkdir(parents=True, exist_ok=True)
        file_name = f"{report_id}.pdf"
        file_path = reports_dir / file_name
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.report_expires_hours)

        self._build_pdf(file_path, chart, analysis, topic_analyses or [])

        return {
            "reportId": report_id,
            "chartId": chart["chartId"],
            "analysisId": analysis["analysisId"],
            "fileName": file_name,
            "filePath": str(file_path),
            "downloadUrl": f"/api/report/download/{report_id}",
            "expiresAt": expires_at.isoformat(),
            "status": "ready",
        }

    def _build_pdf(
        self,
        file_path: Path,
        chart: dict,
        analysis: dict,
        topic_analyses: list[dict],
    ) -> None:
        registerFont(UnicodeCIDFont("STSong-Light"))
        styles = getSampleStyleSheet()
        body = ParagraphStyle(
            "BaziBody",
            parent=styles["BodyText"],
            fontName="STSong-Light",
            fontSize=12,
            leading=19,
            firstLineIndent=24,
            spaceAfter=10,
        )
        title = ParagraphStyle(
            "BaziTitle",
            parent=styles["Title"],
            fontName="STSong-Light",
            fontSize=18,
            leading=26,
            alignment=1,
            spaceAfter=38,
        )
        heading = ParagraphStyle(
            "BaziHeading",
            parent=styles["Heading2"],
            fontName="STSong-Light",
            fontSize=13,
            leading=20,
            spaceBefore=14,
            spaceAfter=8,
            keepWithNext=True,
        )
        disclaimer_heading = ParagraphStyle(
            "BaziDisclaimerHeading",
            parent=heading,
            alignment=1,
        )

        page_width, _ = A4
        portrait_width = 320
        portrait_height = 420

        doc = SimpleDocTemplate(
            str(file_path),
            pagesize=A4,
            rightMargin=32 * mm,
            leftMargin=32 * mm,
            topMargin=28 * mm,
            bottomMargin=22 * mm,
            title=f"{chart['profile']['name']} 八字报告",
        )

        story = [
            Paragraph(self._text(f"{chart['profile']['name']} 八字命盘报告"), title),
            self._centered_flowable(BaziPortraitFlowable(chart, analysis, portrait_width, portrait_height), page_width),
            Spacer(1, 10 * mm),
            Paragraph(self._text(analysis["summary"]), body),
            PageBreak(),
            Spacer(1, 12 * mm),
            self._pillar_table(chart),
            PageBreak(),
            Spacer(1, 12 * mm),
            self._luck_overview_table(chart),
            Spacer(1, 8 * mm),
            self._annual_matrix_table(chart),
            Spacer(1, 8 * mm),
            self._monthly_table(chart),
            Spacer(1, 6 * mm),
            self._gold_rule(),
        ]

        warnings = [*chart.get("warnings", []), *analysis.get("warnings", [])]
        if warnings:
            story.append(Paragraph("提示信息", heading))
            for warning in dict.fromkeys(warnings):
                story.append(Paragraph(self._text(warning), body))

        for title_text, content in self._ordered_sections(analysis, topic_analyses):
            story.append(Paragraph(self._text(title_text), heading))
            story.append(Paragraph(self._text(content), body))

        story.extend(
            [
                Paragraph("免责声明", disclaimer_heading),
                Paragraph(self._text(analysis.get("disclaimer", "")), body),
            ]
        )

        doc.build(story, onFirstPage=self._footer, onLaterPages=self._footer)

    def _centered_flowable(self, flowable: Flowable, page_width: float) -> Table:
        return Table(
            [[flowable]],
            colWidths=[flowable.width],
            hAlign="CENTER",
            style=TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]),
        )

    def _luck_start_text(self, chart: dict) -> str:
        luck_start = chart.get("luckStart") or {}
        basis = luck_start.get("basisSolarTerm")
        basis_text = f"，依据{basis}" if basis else ""
        return f"{luck_start.get('directionText', '')}，{luck_start.get('startAgeText', '')}{basis_text}"

    def _pillar_table(self, chart: dict) -> Table:
        pillars = chart["pillars"]
        keys = ["year", "month", "day", "hour"]
        labels = ["年柱", "月柱", "日柱", "时柱"]
        rows = [
            ["日期", *labels],
            ["主星", *[self._pillar_value(pillars.get(key), "tenGod") for key in keys]],
            ["天干", *[self._colored_pillar_cell(pillars.get(key), "stem") for key in keys]],
            ["地支", *[self._colored_pillar_cell(pillars.get(key), "branch") for key in keys]],
            ["藏干", *[self._hidden_stems(pillars.get(key)) for key in keys]],
            ["副星", *[self._secondary_stars(pillars.get(key)) for key in keys]],
        ]
        table = Table(rows, colWidths=[28 * mm, 31 * mm, 31 * mm, 31 * mm, 31 * mm], hAlign="CENTER")
        commands = [
            ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
            ("FONTSIZE", (0, 0), (-1, -1), 13),
            ("FONTSIZE", (1, 2), (-1, 3), 22),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#9a9a9a")),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f4f4f4")),
            ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#f4f4f4")),
            ("BACKGROUND", (0, 5), (-1, 5), colors.HexColor("#f4f4f4")),
            ("LINEABOVE", (0, 0), (-1, 0), 16, colors.HexColor("#101010")),
            ("LINEBELOW", (0, -1), (-1, -1), 0.6, colors.HexColor("#ededed")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]
        for col, key in enumerate(keys, start=1):
            pillar = pillars.get(key)
            commands.append(("TEXTCOLOR", (col, 2), (col, 2), self._pillar_color(pillar, "stem")))
            commands.append(("TEXTCOLOR", (col, 3), (col, 3), self._pillar_color(pillar, "branch")))
        table.setStyle(TableStyle(commands))
        return table

    def _luck_overview_table(self, chart: dict) -> Table:
        luck_start = chart.get("luckStart") or {}
        cycles = chart.get("luckCycles", [])[:10]
        header = [
            f"起运：{luck_start.get('startAgeText', '未提供')}起运\n"
            f"交运：{luck_start.get('directionText', '')}  {luck_start.get('basisSolarTerm', '')}",
            f"{self._current_age(chart)}岁\n司令：{luck_start.get('basisSolarTerm', '') or '未定'}",
        ]
        years = [str(item.get("startYear", "")) for item in cycles]
        ages = [f"{item.get('startAge', '')}岁" for item in cycles]
        stems = [self._stem_branch_text(item) for item in cycles]
        gods = [str(item.get("tenGodStem") or "") for item in cycles]
        table = Table(
            [[header[0], header[1]], ["大运", *years], ["", *ages], ["", *stems], ["", *gods]],
            colWidths=[36 * mm, *([12 * mm] * len(cycles))],
            hAlign="CENTER",
        )
        table.setStyle(TableStyle([
            ("SPAN", (0, 0), (len(cycles) - 6 if len(cycles) > 6 else 0, 0)),
            ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("FONTSIZE", (0, 1), (0, 4), 18),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f6f6f6")),
            ("TEXTCOLOR", (0, 1), (0, 4), colors.HexColor("#a0a0a0")),
            ("GRID", (1, 1), (-1, 4), 0.35, colors.HexColor("#eeeeee")),
            ("LINEBELOW", (0, -1), (-1, -1), 0.8, colors.HexColor("#eeeeee")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        return table

    def _annual_matrix_table(self, chart: dict) -> Table:
        years = chart.get("annualCycles", [])[:10]
        rows = [["流年", *[str(item.get("year", "")) for item in years]]]
        rows.append(["", *[self._stem_branch_text(item) for item in years]])
        rows.append(["小运", *[str(item.get("tenGodStem") or "") for item in years]])
        table = Table(rows, colWidths=[20 * mm, *([13.6 * mm] * len(years))], hAlign="CENTER")
        table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTSIZE", (0, 0), (0, -1), 16),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#a0a0a0")),
            ("GRID", (1, 0), (-1, -1), 0.35, colors.HexColor("#eeeeee")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        return table

    def _monthly_table(self, chart: dict) -> Table:
        months = chart.get("monthlyCycles", [])[:10]
        rows = [
            ["流月", *[str(item.get("solarTerm", "")) for item in months]],
            ["", *[str(item.get("solarTermDate", "")).split("-")[-2:] and "/".join(str(item.get("solarTermDate", "")).split("-")[-2:]) for item in months]],
            ["", *[self._stem_branch_text(item) for item in months]],
            ["", *[str(item.get("tenGodStem") or "") for item in months]],
        ]
        table = Table(rows, colWidths=[20 * mm, *([13.6 * mm] * len(months))], hAlign="CENTER")
        table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTSIZE", (0, 0), (0, -1), 16),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#a0a0a0")),
            ("GRID", (1, 0), (-1, -1), 0.35, colors.HexColor("#eeeeee")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        return table

    def _gold_rule(self) -> Table:
        table = Table([[""]], colWidths=[152 * mm], rowHeights=[1.2])
        table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#9d7a2a"))]))
        return table

    def _cycle_table(self, items: list[dict], fields: list[str]) -> Table:
        if not items:
            return self._styled_table([["暂无数据"]], [150 * mm])

        labels = {
            "index": "序号",
            "directionText": "顺逆",
            "startAge": "起运年龄",
            "endAge": "止运年龄",
            "startYear": "起年",
            "endYear": "止年",
            "year": "年份",
            "age": "年龄",
            "solarTerm": "节气",
            "solarTermDate": "日期",
            "stem": "天干",
            "branch": "地支",
            "tenGodStem": "十神",
            "tenGodBranch": "支神",
            "isCurrent": "当前",
        }
        rows = [[labels[field] for field in fields]]
        current_rows = []
        for item in items:
            rows.append([self._format_cell(item.get(field)) for field in fields])
            if item.get("isCurrent"):
                current_rows.append(len(rows) - 1)
        return self._styled_table(rows, self._cycle_col_widths(fields), current_rows=current_rows)

    def _cycle_col_widths(self, fields: list[str]) -> list[float]:
        weights = {
            "index": 0.7,
            "directionText": 0.8,
            "startAge": 1.0,
            "endAge": 1.0,
            "startYear": 1.1,
            "endYear": 1.1,
            "year": 1.1,
            "age": 0.8,
            "solarTerm": 1.0,
            "solarTermDate": 1.4,
            "stem": 0.8,
            "branch": 0.8,
            "tenGodStem": 1.0,
            "tenGodBranch": 1.0,
            "isCurrent": 0.8,
        }
        total = sum(weights.get(field, 1.0) for field in fields)
        return [150 * mm * weights.get(field, 1.0) / total for field in fields]

    def _styled_table(
        self,
        rows: list[list],
        col_widths: list[float],
        current_rows: list[int] | None = None,
    ) -> Table:
        table = Table(rows, colWidths=col_widths, hAlign="LEFT", repeatRows=1)
        commands = [
            ("FONTNAME", (0, 0), (-1, -1), "STSong-Light"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3efe3")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c9bfa5")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]
        for row_index in current_rows or []:
            commands.append(("BACKGROUND", (0, row_index), (-1, row_index), colors.HexColor("#fff3cf")))
            commands.append(("TEXTCOLOR", (0, row_index), (-1, row_index), colors.HexColor("#6f4f00")))
        table.setStyle(TableStyle(commands))
        return table

    def _footer(self, canvas, doc) -> None:
        return

    def _pillar_value(self, pillar: dict | None, key: str) -> str:
        if pillar is None:
            return "未知"
        return str(pillar.get(key) or "")

    def _hidden_stems(self, pillar: dict | None) -> str:
        if pillar is None:
            return "未知"
        return "\n".join(pillar.get("hiddenStems") or [])

    def _secondary_stars(self, pillar: dict | None) -> str:
        if pillar is None:
            return "未知"
        stars = pillar.get("secondaryStars") or pillar.get("shensha") or []
        return "\n".join(stars[:3])

    def _colored_pillar_cell(self, pillar: dict | None, key: str) -> str:
        if pillar is None:
            return "未知"
        return self._pillar_value(pillar, key)

    def _pillar_color(self, pillar: dict | None, key: str):
        if pillar is None:
            return colors.HexColor("#333333")
        value = self._pillar_value(pillar, key)
        element = STEM_ELEMENTS.get(value) if key == "stem" else BRANCH_ELEMENTS.get(value)
        return colors.HexColor(ELEMENT_COLORS.get(element or "", "#333333"))

    def _five_element_text(self, chart: dict) -> str:
        return " / ".join(f"{key}：{value}" for key, value in chart.get("fiveElementStats", {}).items())

    def _format_cell(self, value) -> str:
        if isinstance(value, bool):
            return "是" if value else ""
        return "" if value is None else str(value)

    def _stem_branch_text(self, item: dict) -> str:
        stem = str(item.get("stem") or "")
        branch = str(item.get("branch") or "")
        return f"{stem}{branch}"

    def _current_age(self, chart: dict) -> str:
        current = next((item for item in chart.get("annualCycles", []) if item.get("isCurrent")), None)
        return str(current.get("age") if current and current.get("age") is not None else "")

    def _ordered_sections(self, analysis: dict, topic_analyses: list[dict] | None = None) -> list[tuple[str, str]]:
        sections = analysis.get("sections") or []
        contents = [str(section.get("content", "")) for section in sections]
        titles = [str(section.get("title", "")) for section in sections]
        if len(contents) < len(SECTION_TITLES):
            raise ValueError("AI 解读章节不足，无法生成完整 PDF 报告")
        result: list[tuple[str, str]] = []
        for index, expected_title in enumerate(SECTION_TITLES):
            content = contents[index].strip()
            title = titles[index] if titles[index] == expected_title else expected_title
            if not content or content in {"本节解读待生成。", "待生成", "暂无", "略"}:
                raise ValueError("AI 解读章节为空，无法生成完整 PDF 报告")
            topic_excerpt = self._topic_excerpt_for_title(expected_title, topic_analyses or [])
            if topic_excerpt:
                content = f"{content}\n\n专题重点：{topic_excerpt}"
            result.append((title, content))
        if len(contents) > len(SECTION_TITLES):
            for section in sections[len(SECTION_TITLES) :]:
                result.append((str(section.get("title", "补充分析")), str(section.get("content", ""))))
        return result

    def _topic_excerpt_for_title(self, title: str, topic_analyses: list[dict]) -> str:
        excerpts = []
        for topic_result in topic_analyses:
            if topic_result.get("status") != "completed":
                continue
            topic = TOPIC_DEFINITIONS.get(str(topic_result.get("topicSlug", "")))
            if not topic or title not in topic["sourceTitles"]:
                continue
            key_points = [str(item) for item in topic_result.get("keyPoints", []) if str(item).strip()]
            pdf_excerpt = str(topic_result.get("pdfExcerpt") or "").strip()
            if key_points:
                excerpts.append("；".join(key_points[:4]))
            elif pdf_excerpt:
                excerpts.append(pdf_excerpt)
        return "\n".join(excerpts)

    def _text(self, value: object) -> str:
        return escape("" if value is None else str(value))
