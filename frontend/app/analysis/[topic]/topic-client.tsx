"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { BaziPortrait } from "@/components/bazi-portrait";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopicNavigation } from "@/components/topic-navigation";
import { apiRequest } from "@/lib/api/client";
import { getAnalysisTopic, getTopicSections } from "@/lib/analysis/topics";
import type { AnalysisResult, ApiError, BaziChart, TopicAnalysisResult } from "@/types/api";

type LoadState = {
  chart: BaziChart | null;
  analysis: AnalysisResult | null;
  topicAnalysis: TopicAnalysisResult | null;
  error: ApiError | null;
  isLoading: boolean;
  isGenerating: boolean;
};

const LAST_SESSION_STORAGE_KEY = "bazi-last-session-v1";

export default function AnalysisTopicClient() {
  const params = useParams<{ topic: string }>();
  const searchParams = useSearchParams();
  const topic = getAnalysisTopic(params.topic);
  const chartId = searchParams.get("chartId");
  const analysisId = searchParams.get("analysisId");
  const [state, setState] = useState<LoadState>({
    chart: null,
    analysis: null,
    topicAnalysis: null,
    error: null,
    isLoading: true,
    isGenerating: false,
  });

  useEffect(() => {
    if (!state.chart || !state.analysis) {
      return;
    }
    window.localStorage.setItem(
      LAST_SESSION_STORAGE_KEY,
      JSON.stringify({
        analysis: state.analysis,
        chart: state.chart,
        report: null,
      })
    );
  }, [state.analysis, state.chart]);

  useEffect(() => {
    let isActive = true;
    async function loadTopic() {
      if (!topic || !chartId || !analysisId) {
        setState({
          chart: null,
          analysis: null,
          topicAnalysis: null,
          error: {
            code: "TOPIC_PARAMS_MISSING",
            message: "缺少专题分析所需的 chartId 或 analysisId，请先在首页生成 AI 解读。",
            details: {},
          },
          isLoading: false,
          isGenerating: false,
        });
        return;
      }

      setState((current) => ({ ...current, isLoading: true, error: null }));
      try {
        const [chartResult, analysisResult] = await Promise.all([
          apiRequest<BaziChart>(`/chart/${chartId}`),
          apiRequest<AnalysisResult>(`/analysis/${analysisId}`),
        ]);
        if (!isActive) {
          return;
        }
        if (!chartResult.success) {
          setState({
            chart: null,
            analysis: null,
            topicAnalysis: null,
            error: chartResult.error,
            isLoading: false,
            isGenerating: false,
          });
          return;
        }
        if (!analysisResult.success) {
          setState({
            chart: null,
            analysis: null,
            topicAnalysis: null,
            error: analysisResult.error,
            isLoading: false,
            isGenerating: false,
          });
          return;
        }
        let latestTopic: TopicAnalysisResult | null = null;
        const topicResult = await apiRequest<TopicAnalysisResult>(
          `/topic-analysis/chart/${chartId}/${topic.slug}/latest`
        );
        if (topicResult.success) {
          latestTopic = topicResult.data;
        }
        setState({
          chart: chartResult.data,
          analysis: analysisResult.data,
          topicAnalysis: latestTopic,
          error: null,
          isLoading: false,
          isGenerating: false,
        });
      } catch {
        if (isActive) {
          setState({
            chart: null,
            analysis: null,
            topicAnalysis: null,
            error: {
              code: "NETWORK_ERROR",
              message: "无法加载专题分析，请确认后端服务已启动。",
              details: {},
            },
            isLoading: false,
            isGenerating: false,
          });
        }
      }
    }
    loadTopic();
    return () => {
      isActive = false;
    };
  }, [analysisId, chartId, topic]);

  const sections = useMemo(
    () =>
      state.topicAnalysis?.status === "completed"
        ? state.topicAnalysis.sections
        : state.analysis && topic
          ? getTopicSections(state.analysis, topic)
          : [],
    [state.analysis, state.topicAnalysis, topic]
  );

  async function handleGenerateTopic() {
    if (!topic || !state.chart || !state.analysis) {
      return;
    }
    setState((current) => ({ ...current, error: null, isGenerating: true }));
    try {
      const result = await apiRequest<TopicAnalysisResult>("/topic-analysis/generate", {
        method: "POST",
        body: JSON.stringify({
          chartId: state.chart.chartId,
          analysisId: state.analysis.analysisId,
          topicSlug: topic.slug,
        }),
      });
      if (!result.success) {
        setState((current) => ({ ...current, error: result.error, isGenerating: false }));
        return;
      }
      setState((current) => ({
        ...current,
        topicAnalysis: result.data,
        isGenerating: false,
      }));
    } catch {
      setState((current) => ({
        ...current,
        isGenerating: false,
        error: {
          code: "NETWORK_ERROR",
          message: "无法生成专题分析，请确认后端服务已启动。",
          details: {},
        },
      }));
    }
  }

  if (!topic) {
    return <ErrorPage message="未找到对应专题页面。" />;
  }

  if (state.isLoading) {
    return <ErrorPage message="专题加载中..." tone="muted" />;
  }

  if (state.error) {
    return <ErrorPage message={state.error.message} />;
  }

  if (!state.chart || !state.analysis) {
    return <ErrorPage message="专题数据为空，请先返回首页重新生成 AI 解读。" />;
  }

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[296px_1fr]">
      <TopicNavigation
        activeSlug={topic.slug}
        analysisId={state.analysis.analysisId}
        chartId={state.chart.chartId}
      />

      <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-10">
      <header className="mb-5 flex min-h-12 flex-wrap items-center justify-end gap-2">
        <Link className="app-button border border-white/10 text-white/70 hover:border-gold/40 hover:text-gold" href="/">
          排盘首页
        </Link>
        <Link className="app-button border border-white/10 text-white/70 hover:border-gold/40 hover:text-gold" href="/member">
          用户中心
        </Link>
        <ThemeToggle variant="nav" />
      </header>

      <section className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_184px]">
        <div className="app-card overflow-hidden">
          <div className="flex h-full min-h-[184px] flex-col justify-center bg-gradient-to-r from-[rgb(103,75,30)] to-[rgb(151,103,30)] p-6 text-[rgb(255,255,255)] shadow-[0_18px_45px_rgba(75,57,25,0.18)] sm:p-8">
            <p className="text-sm font-semibold text-[rgba(255,255,255,0.82)]">专题工作台</p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">{topic.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[rgba(255,255,255,0.82)]">{topic.subtitle}</p>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[184px] flex-col items-center justify-center rounded-md border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65 lg:max-w-none">
          <BaziPortrait analysis={state.analysis} chart={state.chart} compact />
          <div className="mt-1 text-center">
            <p className="font-semibold text-white">{state.chart.profile.name}</p>
            <p>日主：{state.chart.dayMaster}</p>
          </div>
        </div>
      </section>

      <section className="mb-5">
        <ChartTimingPanel chart={state.chart} />
      </section>

      <section className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <article className="space-y-5 rounded-lg border border-white/10 bg-panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-gold">AI 专题解读</p>
              <p className="mt-2 text-[15px] leading-7 text-white/55">
                {state.topicAnalysis?.status === "completed"
                  ? "以下内容来自本专题单独调用大模型生成的详细分析，PDF 会摘取这些重点。"
                  : "当前显示总报告中的相关章节。点击右侧按钮可为本专题单独调用大模型生成更详细分析。"}
              </p>
            </div>
            <button
              className="h-11 shrink-0 rounded-md bg-gold px-4 text-[15px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
              disabled={state.isGenerating}
              onClick={handleGenerateTopic}
              type="button"
            >
              {state.isGenerating
                ? "生成中..."
                : state.topicAnalysis?.status === "completed"
                  ? "重新生成本页"
                  : "生成本页分析"}
            </button>
          </div>

          {state.topicAnalysis ? (
            <div className="rounded-md border border-white/10 bg-black/20 p-4">
              <p className="text-[15px] font-semibold text-white">{state.topicAnalysis.summary}</p>
              {state.topicAnalysis.keyPoints.length > 0 ? (
                <ul className="mt-3 space-y-2 text-[15px] leading-7 text-white/65">
                  {state.topicAnalysis.keyPoints.map((point) => (
                    <li key={point}>· {point}</li>
                  ))}
                </ul>
              ) : null}
              {state.topicAnalysis.warnings.length > 0 ? (
                <p className="mt-3 text-sm text-gold">{state.topicAnalysis.warnings.join("；")}</p>
              ) : null}
            </div>
          ) : null}

          {sections.length > 0 ? (
            sections.map((section) => (
              <section className="space-y-3" key={section.title}>
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                {splitContent(section.content).map((paragraph, index) => (
                  <p className="text-[15px] leading-8 text-white/70" key={`${section.title}-${index}`}>
                    {paragraph}
                  </p>
                ))}
              </section>
            ))
          ) : (
            <p className="rounded-md border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-100">
              当前 AI 解读缺少「{topic.title}」对应章节，请重新生成 AI 解读。
            </p>
          )}
        </article>

        <aside className="space-y-4">
          <section className="rounded-lg border border-white/10 bg-panel p-5">
            <h2 className="text-lg font-semibold">分析重点</h2>
            <div className="mt-4 grid gap-2">
              {topic.focusItems.map((item) => (
                <div className="rounded-md bg-black/20 px-3 py-2 text-sm text-white/65" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-panel p-5">
            <h2 className="text-lg font-semibold">专题拆解</h2>
            <div className="mt-4 space-y-3">
              {buildTopicBreakdown(state.chart, topic.slug).map((item) => (
                <div className="rounded-md bg-black/20 p-3 text-sm" key={item.label}>
                  <p className="text-white">{item.label}</p>
                  <p className="mt-1 leading-6 text-white/55">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-panel p-5">
            <h2 className="text-lg font-semibold">命盘依据</h2>
            <div className="mt-4 space-y-3 text-sm text-white/65">
              <p>四柱：{pillarText(state.chart)}</p>
              <p>五行：{elementStatsText(state.chart)}</p>
              <p>起运：{state.chart.luckStart.startAgeText}</p>
              <p>当前大运：{currentLuckText(state.chart)}</p>
              <p>当前流年：{currentAnnualText(state.chart)}</p>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-panel p-5">
            <h2 className="text-lg font-semibold">近期参考</h2>
            <div className="mt-4 space-y-2 text-sm text-white/60">
              {state.chart.annualCycles.slice(0, 5).map((cycle) => (
                <div
                  className={`flex items-center justify-between rounded-md px-3 py-2 ${
                    cycle.isCurrent ? "bg-gold/10 text-gold" : "bg-black/20"
                  }`}
                  key={cycle.year}
                >
                  <span>{cycle.year}</span>
                  <span>
                    {cycle.stem}
                    {cycle.branch}
                    {cycle.tenGodStem ? ` · ${cycle.tenGodStem}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-panel p-5">
            <h2 className="text-lg font-semibold">报告信息</h2>
            <div className="mt-4 space-y-2 text-xs text-white/45">
              <p>{state.analysis.analysisId}</p>
              {state.analysis.modelName ? <p>{state.analysis.modelName}</p> : null}
              <p>{state.analysis.disclaimer}</p>
            </div>
          </section>
        </aside>
      </section>
      </section>
    </main>
  );
}

function ErrorPage({ message, tone = "error" }: { message: string; tone?: "error" | "muted" }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-8">
      <Link className="mb-5 text-sm text-gold underline underline-offset-4" href="/">
        返回首页
      </Link>
      <div
        className={
          tone === "error"
            ? "rounded-md border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-100"
            : "rounded-md border border-white/10 bg-panel p-4 text-sm text-white/60"
        }
      >
        {message}
      </div>
    </main>
  );
}

function splitContent(content: string) {
  return content
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const STEM_ELEMENTS: Record<string, string> = {
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",
};

const BRANCH_ELEMENTS: Record<string, string> = {
  寅: "wood",
  卯: "wood",
  巳: "fire",
  午: "fire",
  辰: "earth",
  戌: "earth",
  丑: "earth",
  未: "earth",
  申: "metal",
  酉: "metal",
  子: "water",
  亥: "water",
};

const ELEMENT_COLORS: Record<string, string> = {
  wood: "#24984b",
  fire: "#c9121b",
  earth: "#8a7800",
  metal: "#9a6a11",
  water: "#2f86d1",
};

const BRANCH_HIDDEN_STEMS: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

const TEN_GODS_BY_DAY_STEM: Record<string, Record<string, string>> = {
  甲: { 甲: "比肩", 乙: "劫财", 丙: "食神", 丁: "伤官", 戊: "偏财", 己: "正财", 庚: "七杀", 辛: "正官", 壬: "偏印", 癸: "正印" },
  乙: { 甲: "劫财", 乙: "比肩", 丙: "伤官", 丁: "食神", 戊: "正财", 己: "偏财", 庚: "正官", 辛: "七杀", 壬: "正印", 癸: "偏印" },
  丙: { 甲: "偏印", 乙: "正印", 丙: "比肩", 丁: "劫财", 戊: "食神", 己: "伤官", 庚: "偏财", 辛: "正财", 壬: "七杀", 癸: "正官" },
  丁: { 甲: "正印", 乙: "偏印", 丙: "劫财", 丁: "比肩", 戊: "伤官", 己: "食神", 庚: "正财", 辛: "偏财", 壬: "正官", 癸: "七杀" },
  戊: { 甲: "七杀", 乙: "正官", 丙: "偏印", 丁: "正印", 戊: "比肩", 己: "劫财", 庚: "食神", 辛: "伤官", 壬: "偏财", 癸: "正财" },
  己: { 甲: "正官", 乙: "七杀", 丙: "正印", 丁: "偏印", 戊: "劫财", 己: "比肩", 庚: "伤官", 辛: "食神", 壬: "正财", 癸: "偏财" },
  庚: { 甲: "偏财", 乙: "正财", 丙: "七杀", 丁: "正官", 戊: "偏印", 己: "正印", 庚: "比肩", 辛: "劫财", 壬: "食神", 癸: "伤官" },
  辛: { 甲: "正财", 乙: "偏财", 丙: "正官", 丁: "七杀", 戊: "正印", 己: "偏印", 庚: "劫财", 辛: "比肩", 壬: "伤官", 癸: "食神" },
  壬: { 甲: "食神", 乙: "伤官", 丙: "偏财", 丁: "正财", 戊: "七杀", 己: "正官", 庚: "偏印", 辛: "正印", 壬: "比肩", 癸: "劫财" },
  癸: { 甲: "伤官", 乙: "食神", 丙: "正财", 丁: "偏财", 戊: "正官", 己: "七杀", 庚: "正印", 辛: "偏印", 壬: "劫财", 癸: "比肩" },
};

type TimingColumn = {
  key: string;
  label: string;
  helper?: string;
  mainStar: string;
  stem?: string | null;
  branch?: string | null;
  hiddenItems: string[];
};

function ChartTimingPanel({ chart }: { chart: BaziChart }) {
  const currentLuck = chart.luckCycles.find((cycle) => cycle.isCurrent);
  const currentAnnual = chart.annualCycles.find((cycle) => cycle.isCurrent);
  const currentMonthly = chart.monthlyCycles.find((cycle) => cycle.isCurrent);
  const daily = chart.dailyCycle ?? fallbackDailyCycle();
  const columns: TimingColumn[] = [
    {
      key: "annual",
      label: "流年",
      helper: currentAnnual ? `${currentAnnual.year}年` : undefined,
      mainStar: currentAnnual?.tenGodStem ?? tenGodForStem(chart.dayMaster, currentAnnual?.stem),
      stem: currentAnnual?.stem,
      branch: currentAnnual?.branch,
      hiddenItems: hiddenItemsForBranch(chart.dayMaster, currentAnnual?.branch),
    },
    {
      key: "luck",
      label: "大运",
      helper: currentLuck ? `${currentLuck.startAge}-${currentLuck.endAge}岁` : undefined,
      mainStar: currentLuck?.tenGodStem ?? tenGodForStem(chart.dayMaster, currentLuck?.stem),
      stem: currentLuck?.stem,
      branch: currentLuck?.branch,
      hiddenItems: hiddenItemsForBranch(chart.dayMaster, currentLuck?.branch),
    },
    {
      key: "monthly",
      label: "流月",
      helper: currentMonthly ? currentMonthly.solarTerm : undefined,
      mainStar: currentMonthly?.tenGodStem ?? tenGodForStem(chart.dayMaster, currentMonthly?.stem),
      stem: currentMonthly?.stem,
      branch: currentMonthly?.branch,
      hiddenItems: hiddenItemsForBranch(chart.dayMaster, currentMonthly?.branch),
    },
    {
      key: "daily",
      label: "流日",
      helper: daily.date,
      mainStar: daily.tenGodStem ?? tenGodForStem(chart.dayMaster, daily.stem),
      stem: daily.stem,
      branch: daily.branch,
      hiddenItems: hiddenItemsForBranch(chart.dayMaster, daily.branch),
    },
    pillarColumn("year", "年柱", chart.pillars.year),
    pillarColumn("month", "月柱", chart.pillars.month),
    {
      ...pillarColumn("day", "日柱", chart.pillars.day),
      mainStar: chart.profile.gender === "female" ? "元女" : "元男",
    },
    pillarColumn("hour", "时柱", chart.pillars.hour),
  ];

  return (
    <div className="overflow-hidden rounded-md border border-[#e7e0d3] bg-[#fffdf8] shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[44px_repeat(8,minmax(64px,1fr))] bg-[#f4f4f2] text-center text-sm font-medium text-[#929292]">
            <div className="px-1.5 py-2 text-left text-base font-normal">日期</div>
            {columns.map((column) => (
              <div className="px-1 py-2 text-base font-normal" key={column.key}>
                {column.label}
                {column.helper ? (
                  <div className="mt-0.5 text-[10px] font-normal text-[#aaa39a]">
                    {column.helper}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <TimingRow label="主星">
            {columns.map((column) => (
              <div className="px-1 py-2.5 text-center text-base text-[#3f3f3f]" key={column.key}>
                {column.mainStar}
              </div>
            ))}
          </TimingRow>

          <TimingRow label="天干">
            {columns.map((column) => (
              <div className="px-1 py-2 text-center text-[26px] font-semibold leading-none" key={column.key}>
                {column.stem ? (
                  <span style={{ color: colorForStem(column.stem) }}>{column.stem}</span>
                ) : (
                  <span className="text-base text-[#aaa39a]">未知</span>
                )}
              </div>
            ))}
          </TimingRow>

          <TimingRow label="地支">
            {columns.map((column) => (
              <div className="px-1 py-2 text-center text-[26px] font-semibold leading-none" key={column.key}>
                {column.branch ? (
                  <span style={{ color: colorForBranch(column.branch) }}>{column.branch}</span>
                ) : (
                  <span className="text-base text-[#aaa39a]">未知</span>
                )}
              </div>
            ))}
          </TimingRow>

          <TimingRow label="藏干" isLast>
            {columns.map((column) => (
              <div
                className="flex min-h-[64px] flex-col items-center gap-0.5 px-0.5 py-2.5 text-center text-[13px] leading-tight text-[#3f3f3f]"
                key={column.key}
              >
                {column.hiddenItems.length > 0 ? (
                  column.hiddenItems.map((item, index) => (
                    <HiddenStemText key={`${column.key}-${item}-${index}`} text={item} />
                  ))
                ) : (
                  <span className="text-sm text-[#aaa39a]">未知</span>
                )}
              </div>
            ))}
          </TimingRow>
        </div>
      </div>
    </div>
  );
}

function TimingRow({
  children,
  isLast = false,
  label,
}: {
  children: ReactNode;
  isLast?: boolean;
  label: string;
}) {
  return (
    <div
      className={`grid grid-cols-[44px_repeat(8,minmax(64px,1fr))] border-t border-[#ece6dc] ${
        isLast ? "bg-[#f7f7f5]" : "bg-[#fffdf8]"
      }`}
    >
      <div className="flex items-center px-1.5 text-base font-normal text-[#929292]">
        {label}
      </div>
      {children}
    </div>
  );
}

function HiddenStemText({ text }: { text: string }) {
  const stem = text.slice(0, 1);
  const rest = text.slice(1);
  return (
    <span>
      <span style={{ color: colorForStem(stem) }}>{stem}</span>
      {rest}
    </span>
  );
}

function pillarColumn(
  key: string,
  label: string,
  pillar: BaziChart["pillars"]["year"] | BaziChart["pillars"]["hour"]
): TimingColumn {
  return {
    key,
    label,
    mainStar: pillar?.tenGod ?? "未知",
    stem: pillar?.stem,
    branch: pillar?.branch,
    hiddenItems: hiddenItemsForPillar(pillar),
  };
}

function hiddenItemsForPillar(pillar: BaziChart["pillars"]["year"] | BaziChart["pillars"]["hour"]) {
  if (!pillar) {
    return [];
  }
  return pillar.hiddenStems.map((stem, index) => `${stem}${pillar.secondaryStars[index] ?? ""}`);
}

function hiddenItemsForBranch(dayMaster: string, branch?: string | null) {
  if (!branch) {
    return [];
  }
  return (BRANCH_HIDDEN_STEMS[branch] ?? []).map((stem) => `${stem}${tenGodForStem(dayMaster, stem)}`);
}

function tenGodForStem(dayMaster: string, stem?: string | null) {
  if (!stem) {
    return "未定";
  }
  return TEN_GODS_BY_DAY_STEM[dayMaster]?.[stem] ?? "未定";
}

function colorForStem(stem: string) {
  return ELEMENT_COLORS[STEM_ELEMENTS[stem]] ?? "#4b5563";
}

function colorForBranch(branch: string) {
  return ELEMENT_COLORS[BRANCH_ELEMENTS[branch]] ?? "#4b5563";
}

function fallbackDailyCycle() {
  const stems = "甲乙丙丁戊己庚辛壬癸".split("");
  const branches = "子丑寅卯辰巳午未申酉戌亥".split("");
  const today = new Date();
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const reference = Date.UTC(2026, 6, 8);
  const offset = Math.round((utcToday - reference) / 86400000);
  const referenceIndex = 19; // 2026-07-08 为癸未日。
  const index = (referenceIndex + offset + 60) % 60;
  return {
    date: today.toISOString().slice(0, 10),
    stem: stems[index % 10],
    branch: branches[index % 12],
    tenGodStem: null,
    tenGodBranch: null,
    relationSummary: "",
    isCurrent: true,
  };
}

function pillarText(chart: BaziChart) {
  const pillars = chart.pillars;
  return ["year", "month", "day", "hour"]
    .map((key) => {
      const pillar = pillars[key as keyof typeof pillars];
      return pillar ? `${pillar.stem}${pillar.branch}` : "未知";
    })
    .join(" ");
}

function elementStatsText(chart: BaziChart) {
  return Object.entries(chart.fiveElementStats)
    .map(([key, value]) => `${key}${value}`)
    .join(" / ");
}

function currentLuckText(chart: BaziChart) {
  const current = chart.luckCycles.find((cycle) => cycle.isCurrent);
  return current ? `${current.stem}${current.branch}（${current.startAge}-${current.endAge}岁）` : "未定位";
}

function currentAnnualText(chart: BaziChart) {
  const current = chart.annualCycles.find((cycle) => cycle.isCurrent);
  return current ? `${current.year} ${current.stem}${current.branch}` : "未定位";
}

function buildTopicBreakdown(chart: BaziChart, slug: string) {
  const elements = elementStatsText(chart);
  const luck = currentLuckText(chart);
  const annual = currentAnnualText(chart);
  const common = [
    { label: "五行结构", value: elements || "暂无五行统计" },
    { label: "当前节奏", value: `大运 ${luck}，流年 ${annual}` },
  ];
  const topicSpecific: Record<string, { label: string; value: string }[]> = {
    yongshen: [
      { label: "取用入口", value: "优先观察月令、日主强弱、五行偏枯和调候需求。" },
      { label: "验证方式", value: "结合当前大运和流年，看喜用是否得到承接或被冲克。" },
    ],
    shishen: [
      { label: "十神入口", value: "先看天干透出，再看地支藏干，最后看组合是否成势。" },
      { label: "结构重点", value: "官杀、印星、财星、食伤与日主之间的生克制化是核心。" },
    ],
    personality: [
      { label: "性格入口", value: "日主代表底色，月令代表环境压力，十神代表表达方式。" },
      { label: "调整方向", value: "重点不是给性格定性，而是识别压力来源和可训练的稳定节奏。" },
    ],
    "career-wealth": [
      { label: "事业入口", value: "看能力星、规则星、资源星和输出星是否形成闭环。" },
      { label: "财富入口", value: "看财星位置、食伤生财路径，以及大运是否打开变现机会。" },
    ],
    relationship: [
      { label: "关系入口", value: "结合配偶星、婚姻宫、冲合刑害和流年触发点观察。" },
      { label: "表达边界", value: "感情分析只做倾向参考，不替用户做关系决策。" },
    ],
    health: [
      { label: "健康入口", value: "从五行偏旺偏弱推生活节奏提醒，不做医学诊断。" },
      { label: "重点观察", value: "睡眠、压力、脾胃、肝胆、心火和水气不足等节律问题。" },
    ],
    cities: [
      { label: "城市入口", value: "把喜用五行转译成气候、产业、流动性和生活节奏。" },
      { label: "筛选方式", value: "优先看城市是否能补足命局需要，并匹配事业发展路径。" },
    ],
  };
  return [...common, ...(topicSpecific[slug] ?? [])];
}
