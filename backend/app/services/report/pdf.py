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
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.config import settings


class PdfReportService:
    """Server-side PDF report renderer."""

    def render(self, chart: dict, analysis: dict) -> dict:
        report_id = f"report_{uuid4().hex}"
        reports_dir = Path("reports")
        reports_dir.mkdir(parents=True, exist_ok=True)
        file_name = f"{report_id}.pdf"
        file_path = reports_dir / file_name
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.report_expires_hours)

        self._build_pdf(file_path, chart, analysis)

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

    def _build_pdf(self, file_path: Path, chart: dict, analysis: dict) -> None:
        registerFont(UnicodeCIDFont("STSong-Light"))
        styles = getSampleStyleSheet()
        body = ParagraphStyle(
            "BaziBody",
            parent=styles["BodyText"],
            fontName="STSong-Light",
            fontSize=10.5,
            leading=16,
            spaceAfter=8,
        )
        title = ParagraphStyle(
            "BaziTitle",
            parent=styles["Title"],
            fontName="STSong-Light",
            fontSize=20,
            leading=26,
            spaceAfter=14,
        )
        heading = ParagraphStyle(
            "BaziHeading",
            parent=styles["Heading2"],
            fontName="STSong-Light",
            fontSize=14,
            leading=18,
            spaceBefore=10,
            spaceAfter=8,
        )

        doc = SimpleDocTemplate(
            str(file_path),
            pagesize=A4,
            rightMargin=18 * mm,
            leftMargin=18 * mm,
            topMargin=16 * mm,
            bottomMargin=16 * mm,
            title=f"{chart['profile']['name']} 八字报告",
        )

        story = [
            Paragraph(self._text(f"{chart['profile']['name']} 八字命盘报告"), title),
            Paragraph(self._text(analysis["summary"]), body),
            Spacer(1, 4 * mm),
            Paragraph("基础信息", heading),
            self._profile_table(chart),
            Paragraph("四柱命盘", heading),
            self._pillar_table(chart),
            Paragraph("五行统计", heading),
            Paragraph(self._five_element_text(chart), body),
            Paragraph("大运", heading),
            self._cycle_table(chart.get("luckCycles", [])[:8], ["index", "startYear", "endYear", "stem", "branch"]),
            Paragraph("流年", heading),
            self._cycle_table(chart.get("annualCycles", [])[:11], ["year", "stem", "branch", "isCurrent"]),
        ]

        for section in analysis.get("sections", []):
            story.append(Paragraph(self._text(section.get("title", "综合解读")), heading))
            story.append(Paragraph(self._text(section.get("content", "")), body))

        story.extend(
            [
                Paragraph("画像提示词摘要", heading),
                Paragraph(self._text(analysis.get("imagePromptSummary", "暂无画像摘要。")), body),
                Paragraph("免责声明", heading),
                Paragraph(self._text(analysis.get("disclaimer", "")), body),
            ]
        )

        doc.build(story, onFirstPage=self._footer, onLaterPages=self._footer)

    def _profile_table(self, chart: dict) -> Table:
        profile = chart["profile"]
        rows = [
            ["姓名", profile.get("name", "")],
            ["性别", "男" if profile.get("gender") == "male" else "女"],
            ["公历", profile.get("solarDateTime") or "未提供"],
            ["农历", profile.get("lunarDateText") or "未提供"],
            ["真太阳时", profile.get("trueSolarTime") or "未提供"],
            [
                "出生地",
                f"{profile.get('birthPlaceText') or '未提供'} "
                f"({profile.get('latitude')}, {profile.get('longitude')})",
            ],
        ]
        return self._styled_table(rows, [28 * mm, 122 * mm])

    def _pillar_table(self, chart: dict) -> Table:
        pillars = chart["pillars"]
        keys = ["year", "month", "day", "hour"]
        labels = ["年柱", "月柱", "日柱（日主）", "时柱"]
        rows = [
            ["项目", *labels],
            ["天干", *[self._pillar_value(pillars.get(key), "stem") for key in keys]],
            ["地支", *[self._pillar_value(pillars.get(key), "branch") for key in keys]],
            ["十神", *[self._pillar_value(pillars.get(key), "tenGod") for key in keys]],
            ["藏干", *[self._hidden_stems(pillars.get(key)) for key in keys]],
            ["纳音", *[self._pillar_value(pillars.get(key), "nayin") for key in keys]],
        ]
        return self._styled_table(rows, [28 * mm, 30 * mm, 30 * mm, 30 * mm, 30 * mm])

    def _cycle_table(self, items: list[dict], fields: list[str]) -> Table:
        if not items:
            return self._styled_table([["暂无数据"]], [150 * mm])

        labels = {
            "index": "序号",
            "startYear": "起年",
            "endYear": "止年",
            "year": "年份",
            "stem": "天干",
            "branch": "地支",
            "isCurrent": "当前",
        }
        rows = [[labels[field] for field in fields]]
        for item in items:
            rows.append([self._format_cell(item.get(field)) for field in fields])
        return self._styled_table(rows, [150 * mm / len(fields)] * len(fields))

    def _styled_table(self, rows: list[list], col_widths: list[float]) -> Table:
        table = Table(rows, colWidths=col_widths, hAlign="LEFT", repeatRows=1)
        table.setStyle(
            TableStyle(
                [
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
            )
        )
        return table

    def _footer(self, canvas, doc) -> None:
        canvas.saveState()
        canvas.setFont("STSong-Light", 8)
        canvas.setFillColor(colors.HexColor("#7a715f"))
        canvas.drawRightString(195 * mm, 9 * mm, f"第 {doc.page} 页")
        canvas.drawString(18 * mm, 9 * mm, "传统文化参考报告，非专业决策建议")
        canvas.restoreState()

    def _pillar_value(self, pillar: dict | None, key: str) -> str:
        if pillar is None:
            return "未知"
        return str(pillar.get(key) or "")

    def _hidden_stems(self, pillar: dict | None) -> str:
        if pillar is None:
            return "未知"
        return "、".join(pillar.get("hiddenStems") or [])

    def _five_element_text(self, chart: dict) -> str:
        return " / ".join(f"{key}：{value}" for key, value in chart.get("fiveElementStats", {}).items())

    def _format_cell(self, value) -> str:
        if isinstance(value, bool):
            return "是" if value else ""
        return "" if value is None else str(value)

    def _text(self, value: object) -> str:
        return escape("" if value is None else str(value))
