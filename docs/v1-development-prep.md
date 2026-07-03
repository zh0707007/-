# 八字测算工具 v1.0 开发前准备

本文档基于 `软件开发说明书.md`、`AGENTS.md` 和 `assets/software-spec/` 参考图整理，用于进入 v1.0 工程开发前统一架构、接口、依赖、任务和验收边界。

## 1. 交付目标

v1.0 采用快速本地版策略：先用 SQLite 跑通完整闭环，后续保持模型可迁移到 PostgreSQL。

必须完成的闭环：

- 用户在网页端输入公历、农历或完整四柱信息。
- 后端完成确定性排盘，返回四柱、大运、流年、流月、真太阳时和经纬度。
- 前端展示命盘结果，并在当前大运、当前流年、当前流月上高亮。
- 后端基于标准命盘调用 OpenAI-compatible API 生成 AI 解读。
- 后端生成可下载 PDF 报告，报告包含免责声明。

明确不做：

- 登录、注册、会员、支付。
- 后台管理、多租户、多档案管理。
- 订单、社交分享、评论、社区功能。
- 让大模型自行重算四柱。

## 2. 工程结构

后续实现采用前后端分离目录：

```text
bazi_project/
  frontend/
    app/
    components/
    lib/
    types/
  backend/
    app/
      api/
      core/
      models/
      schemas/
      services/
        chart/
        geo/
        llm/
        report/
    tests/
  docs/
  assets/
```

前端职责：

- 表单输入、校验、模式切换和状态展示。
- 调用后端接口并渲染命盘、AI 解读、PDF 下载状态。
- 适配手机端与桌面端，不在浏览器端生成正式 PDF。

后端职责：

- 统一响应格式、错误码、请求 ID。
- 地区检索、真太阳时、历法换算、排盘、大运、流年、流月。
- LLM 调用、提示词约束、AI 解读降级。
- PDF 渲染、文件保存、下载地址有效期。

## 3. 技术与依赖默认值

前端：

- Next.js + React + TypeScript。
- Tailwind CSS。
- React Hook Form + Zod。
- 轻量自研表格/卡片组件，移动端允许横向滚动。

后端：

- Python FastAPI。
- Pydantic 用于请求和响应模型。
- SQLAlchemy 用于 SQLite，本地 `DATABASE_URL` 默认 `sqlite:///./data/bazi.db`。
- `sxtwl` 作为历法、农历、节气、干支计算底座。
- PDF 生成优先使用 WeasyPrint 或 ReportLab；若中文字体和表格控制要求更高，优先 ReportLab。

配置环境变量：

```env
DATABASE_URL=sqlite:///./data/bazi.db
LLM_BASE_URL=https://api.example.com/v1
LLM_API_KEY=replace-with-real-key
LLM_MODEL=replace-with-model-name
LLM_TIMEOUT_SECONDS=60
REPORT_EXPIRES_HOURS=24
```

安全要求：

- `LLM_API_KEY` 只能由后端读取，不得进入前端构建产物。
- 日志不得记录完整 API Key、敏感 token 或过量用户输入。
- 生成的 PDF、临时文件、数据库文件和本地 `.env` 不应提交。

## 4. API 契约

所有接口统一返回：

```json
{
  "success": true,
  "data": {},
  "requestId": "req_20260703213000001"
}
```

失败返回：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "出生时间不能为空",
    "details": {}
  },
  "requestId": "req_20260703213000001"
}
```

固定接口：

- `GET /api/geo/search?keyword=北京`
  - 返回候选地区、经纬度和时区。
  - v1 可先使用内置城市数据，保留替换正式地理服务的接口。
- `POST /api/chart/calculate`
  - 支持 `inputMode: "solar" | "lunar" | "manual"`。
  - 返回标准命盘、警告信息、当前大运、流年和流月。
- `POST /api/analysis/generate`
  - 只接收 `chartId` 和分析选项。
  - LLM 必须基于后端保存的标准命盘生成内容。
- `POST /api/report/pdf`
  - 接收 `chartId` 和 `analysisId`。
  - 返回 `reportId`、`fileName`、`downloadUrl`、`expiresAt`。

核心错误码：

- `VALIDATION_ERROR`
- `INVALID_PILLAR`
- `GEO_NOT_FOUND`
- `GEO_PROVIDER_ERROR`
- `CALENDAR_CONVERT_ERROR`
- `CHART_CALCULATION_ERROR`
- `CHART_NOT_FOUND`
- `LLM_TIMEOUT`
- `LLM_PROVIDER_ERROR`
- `ANALYSIS_GENERATION_ERROR`
- `ANALYSIS_NOT_FOUND`
- `PDF_RENDER_ERROR`
- `REPORT_STORAGE_ERROR`

## 5. 核心数据模型

SQLite 阶段建议建表：

- `chart_requests`：原始输入、标准化输入、状态、创建时间。
- `charts`：标准命盘 JSON、排盘警告、创建时间。
- `analysis_results`：AI 解读 JSON、模型信息、状态、创建时间。
- `pdf_reports`：报告文件名、路径、下载地址、过期时间、状态。

实体 ID 默认使用带前缀字符串：

- `chart_...`
- `analysis_...`
- `report_...`
- `req_...`

核心类型按说明书落地：

- `BirthInput`
- `ManualBaziInput`
- `BaziChart`
- `DaYunItem`
- `LiuNianItem`
- `AnalysisResult`
- `PdfReport`

`BaziChart` 必须包含：

- 用户资料：姓名、性别、公历时间、农历文本、真太阳时、出生地、经纬度。
- 四柱：年柱、月柱、日柱、时柱；未知时辰时 `hour` 为空或标记未知。
- 命盘元素：十神、藏干、纳音、神煞、星运、自坐、空亡。
- 运势周期：大运、流年、流月。
- 警告：立春交界、节气交界、夜子时、未知时辰等。

## 6. 排盘规则边界

后端排盘服务必须封装为确定性模块，LLM 不参与计算。

必须覆盖：

- 年柱以立春为分界。
- 月柱以节气为分界。
- 农历输入支持闰月。
- 夜子时：23:00 后按次日计算日柱，并在结果中注明。
- 真太阳时：按出生地经度与东八区标准经度 120 度校正，用于时辰判断。
- 未知时辰：不推断时柱，依赖时柱的分析降级。
- 大运顺逆：阳年男、阴年女顺排；阴年男、阳年女逆排。
- 起运年龄：按出生时间到最近节气的时间差计算。

建议实现顺序：

1. 天干、地支、五行、十神等基础常量。
2. 输入标准化和四柱合法性校验。
3. 公历排盘。
4. 农历转公历后排盘。
5. 手动四柱生成标准命盘。
6. 大运、流年、流月。
7. 警告和降级标记。

## 7. 前端页面准备

首页必须是可用排盘表单，不做营销式落地页。

首页字段：

- 姓名。
- 性别：男 / 女。
- 输入模式：公历 / 农历 / 四柱。
- 出生时间。
- 出生地区。
- 真太阳时只读展示。
- 经纬度只读展示。
- 开始排盘按钮。

结果页必须展示：

- 农历日期、公历日期。
- 年柱、月柱、日柱、时柱，日柱标记为“日主”。
- 主星、天干、地支、藏干、副星、星运、自坐、空亡、纳音、神煞。
- 大运、流年、流月，当前项高亮。
- AI 解读生成状态和失败重试入口。
- “下载 PDF 报告”按钮。

视觉默认：

- 参考图的深色背景与金色主按钮。
- 表格在移动端横向滚动。
- 文案固定：“开始排盘”“下载 PDF 报告”。

## 8. AI 与 PDF 准备

LLM 调用要求：

- 使用 OpenAI-compatible API 抽象。
- 系统提示词必须要求只基于后端命盘数据解读，不得重算四柱。
- 输出必须中性、建设性，不恐吓用户。
- 健康、财务、感情内容必须包含专业决策提醒。
- 结尾必须包含免责声明。

AI 解读最少章节：

- 命主画像提示词摘要。
- 日主强弱、用神、十神、五行、格局、命局类型。
- 当前大运、当前流年、未来 1-3 年趋势。
- 性格、职业、财运、婚姻、适合城市、健康。
- 历史事件校准问题 3-5 条。
- 综合建议和免责声明。

PDF 要求：

- A4 竖版。
- 首页包含报告标题、姓名、性别、公历/农历生日、出生地、真太阳时、生成日期。
- 包含命主画像摘要或占位图。
- 四柱、大运、流年、流月不得裁切或重叠。
- 页脚包含页码和免责声明短句。
- 末尾包含完整免责声明。

## 9. 任务拆分

第一批任务：工程骨架

- 初始化 `frontend/` Next.js 工程。
- 初始化 `backend/` FastAPI 工程。
- 配置 `.env.example`、依赖清单、启动脚本。
- 修复或重新初始化 Git 仓库状态。

第二批任务：后端基础

- 实现统一响应、错误码、请求 ID。
- 实现 Pydantic schema 和 SQLAlchemy 模型。
- 实现 SQLite 数据库连接和基础持久化。
- 实现内置城市数据和 `GET /api/geo/search`。

第三批任务：排盘核心

- 封装 `sxtwl` 适配层。
- 实现公历、农历、手动四柱三种输入模式。
- 实现真太阳时、夜子时、节气交界、立春交界、未知时辰标记。
- 实现大运、流年、流月。

第四批任务：前端闭环

- 实现首页表单和模式切换。
- 实现地区搜索和只读真太阳时/经纬度展示。
- 实现结果页四柱表、大运、流年、流月。
- 实现 AI 解读状态和 PDF 下载交互。

第五批任务：AI 与 PDF

- 实现 LLM client 和提示词模板。
- 实现 `POST /api/analysis/generate`。
- 实现 PDF report service。
- 实现 `POST /api/report/pdf` 和下载地址有效期。

第六批任务：测试和验收

- 补齐后端单元测试和接口测试。
- 补齐前端表单和页面状态测试。
- 做手机端和桌面端视觉验收。
- 打开生成 PDF，检查字段完整性和版式溢出。

## 10. 测试清单

后端单元测试：

- 公历排盘。
- 农历排盘。
- 闰月。
- 立春交界。
- 节气交界。
- 夜子时。
- 完整四柱输入。
- 未知时辰。
- 真太阳时。
- 大运顺逆。

后端接口测试：

- 统一成功响应。
- 统一失败响应。
- 字段校验。
- 地区未找到。
- 手动四柱非法。
- LLM 超时降级。
- PDF 渲染失败。

前端测试：

- 三种输入模式切换。
- 首页表单校验。
- 地区搜索 loading 和失败。
- 排盘 loading 和防重复提交。
- 结果页日主标记。
- 当前大运、流年、流月高亮。
- PDF 按钮文案为“下载 PDF 报告”。

人工验收：

- 手机端首页单列可用。
- 桌面端结果页信息密度合理。
- 复杂表格可横向滚动。
- LLM 失败时仍可查看命盘。
- PDF 可下载、打开、无裁切、无重叠。

## 11. 当前仓库注意事项

- 当前目录存在 `.git` 文件夹，但 `git status` 返回 `fatal: not a git repository`。正式开发前需要修复或重新初始化 Git。
- 当前仓库尚无前后端工程骨架，因此尚无可运行的构建、启动、测试命令。
- 不要提交真实密钥、`.env`、生成 PDF、数据库文件或依赖目录。
- 原始说明书和参考图作为需求来源保留，不在开发准备阶段改写。

