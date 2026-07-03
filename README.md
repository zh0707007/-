# 八字测算工具

网页端八字排盘、AI 解读与 PDF 报告生成工具。用户输入出生信息或完整八字后，系统排盘并调用大模型生成完整 PDF 报告。当前需求来源以 `软件开发说明书.md` 和 `docs/v1-development-prep.md` 为准。

## 目录

```text
frontend/  Next.js + React + TypeScript 前端骨架
backend/   FastAPI 后端骨架
docs/      开发准备与执行文档
assets/    软件说明书参考图
```

## 前端

计划技术栈：

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod

常用命令：

```bash
cd frontend
npm install
npm run dev
npm run build
npm run typecheck
```

## 后端

计划技术栈：

- Python 3.11+
- FastAPI
- Pydantic
- SQLAlchemy
- SQLite
- lunar-python
- OpenAI-compatible API
- ReportLab

常用命令：

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
pytest
```

## 当前状态

- 已创建前端和后端骨架。
- `GET /api/geo/search` 已支持内置城市检索。
- `POST /api/chart/calculate` 已支持手动四柱、公历、农历排盘。
- 排盘结果会保存到 SQLite 的 `chart_requests` 和 `charts` 表。
- AI 解读和 PDF 报告接口仍为后续开发内容。
