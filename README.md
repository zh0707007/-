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
- `GET /api/geo/search` 已支持内置城市检索，前端可选择出生地并用于真太阳时计算。
- `POST /api/chart/calculate` 已支持手动四柱、公历、农历排盘。
- `GET /api/chart/{chartId}` 已支持读取已保存命盘。
- 大运、流年、流月已输出当前项、年龄、十神；公历/农历排盘会按前后节气估算起运年龄，并在前端与 PDF 中展示。
- 排盘结果会保存到 SQLite 的 `chart_requests` 和 `charts` 表。
- `POST /api/analysis/generate` 已支持 OpenAI-compatible 调用与本地摘要降级，LLM 超时会返回明确提示。
- `GET /api/analysis/{analysisId}` 和 `GET /api/analysis/chart/{chartId}/latest` 已支持读取已生成解读。
- `POST /api/report/pdf` 已支持服务端生成 PDF，包含四柱、大运、流年、流月、提示信息和免责声明，并通过下载接口返回报告文件。
- `GET /api/report/{reportId}` 和 `GET /api/report/chart/{chartId}/latest` 已支持读取 PDF 报告元数据。
- 前端首页已接入排盘、AI 解读和“下载 PDF 报告”主流程。
- 后端已为参数校验、历法转换、LLM 超时、PDF 下载等核心错误场景提供统一响应格式和测试覆盖。
