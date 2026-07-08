"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-8">
      <TopicNavigation
        activeSlug={topic.slug}
        analysisId={state.analysis.analysisId}
        chartId={state.chart.chartId}
      />

      <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-sm text-gold underline underline-offset-4" href="/">
            返回首页
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">{topic.title}</h1>
          <p className="mt-2 text-sm text-white/50">{topic.subtitle}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
          <p>{state.chart.profile.name}</p>
          <p>日主：{state.chart.dayMaster}</p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <article className="space-y-5 rounded-lg border border-white/10 bg-panel p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-gold">AI 专题解读</p>
              <p className="mt-2 text-sm leading-7 text-white/55">
                {state.topicAnalysis?.status === "completed"
                  ? "以下内容来自本专题单独调用大模型生成的详细分析，PDF 会摘取这些重点。"
                  : "当前显示总报告中的相关章节。点击右侧按钮可为本专题单独调用大模型生成更详细分析。"}
              </p>
            </div>
            <button
              className="h-11 shrink-0 rounded-md bg-gold px-4 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
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
              <p className="text-sm font-semibold text-white">{state.topicAnalysis.summary}</p>
              {state.topicAnalysis.keyPoints.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-white/65">
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
                  <p className="text-sm leading-8 text-white/70" key={`${section.title}-${index}`}>
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
