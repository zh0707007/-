"use client";

import { useEffect, useMemo, useState } from "react";

import { apiOrigin, apiRequest } from "@/lib/api/client";
import type { AnalysisResult, ApiError, BaziChart, BirthPlace, Gender, InputMode, PdfReport } from "@/types/api";

const defaultPlace: BirthPlace = {
  name: "北京市",
  province: "北京市",
  city: "北京市",
  latitude: 39.9042,
  longitude: 116.4074,
  timezone: "Asia/Shanghai"
};

const heavenlyStems = "甲乙丙丁戊己庚辛壬癸";
const earthlyBranches = "子丑寅卯辰巳午未申酉戌亥";

type PillarField = "yearPillar" | "monthPillar" | "dayPillar" | "hourPillar";

export default function HomePage() {
  const [name, setName] = useState("张三");
  const [gender, setGender] = useState<Gender>("male");
  const [inputMode, setInputMode] = useState<InputMode>("solar");
  const [birthDateTime, setBirthDateTime] = useState("1990-01-01T00:00");
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [unknownBirthHour, setUnknownBirthHour] = useState(false);
  const [geoKeyword, setGeoKeyword] = useState(defaultPlace.name ?? defaultPlace.city);
  const [selectedPlace, setSelectedPlace] = useState<BirthPlace>(defaultPlace);
  const [geoResults, setGeoResults] = useState<BirthPlace[]>([]);
  const [geoMessage, setGeoMessage] = useState("");
  const [isSearchingGeo, setIsSearchingGeo] = useState(false);
  const [manualPillars, setManualPillars] = useState({
    yearPillar: "己巳",
    monthPillar: "丙子",
    dayPillar: "丙寅",
    hourPillar: "戊子"
  });
  const [chart, setChart] = useState<BaziChart | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [report, setReport] = useState<PdfReport | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const isManual = inputMode === "manual";
  const trueSolarPreview = useMemo(() => {
    const parsed = new Date(birthDateTime);
    if (Number.isNaN(parsed.getTime())) {
      return "待计算";
    }
    const offsetMinutes = (selectedPlace.longitude - 120) * 4;
    return new Date(parsed.getTime() + offsetMinutes * 60 * 1000).toLocaleString("zh-CN", {
      hour12: false
    });
  }, [birthDateTime, selectedPlace.longitude]);

  useEffect(() => {
    if (isManual) {
      setGeoResults([]);
      setGeoMessage("");
      return;
    }

    const keyword = geoKeyword.trim();
    if (!keyword) {
      setIsSearchingGeo(false);
      setGeoResults([]);
      setGeoMessage("请输入出生城市");
      return;
    }

    let isActive = true;
    setIsSearchingGeo(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await apiRequest<BirthPlace[]>(
          `/geo/search?keyword=${encodeURIComponent(keyword)}`
        );
        if (!isActive) {
          return;
        }
        if (result.success) {
          setGeoResults(result.data);
          setGeoMessage("");
        } else {
          setGeoResults([]);
          setGeoMessage(result.error.message);
        }
      } catch {
        if (isActive) {
          setGeoResults([]);
          setGeoMessage("地区检索暂不可用");
        }
      } finally {
        if (isActive) {
          setIsSearchingGeo(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [geoKeyword, isManual]);

  function updatePillar(field: PillarField, value: string) {
    setManualPillars((current) => ({
      ...current,
      [field]: value
    }));
  }

  function selectPlace(place: BirthPlace) {
    setSelectedPlace(place);
    setGeoKeyword(place.name ?? place.city);
    setGeoResults([]);
    setGeoMessage("");
  }

  function birthPlaceForRequest(place: BirthPlace) {
    return {
      province: place.province,
      city: place.city,
      district: place.district,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone
    };
  }

  function makeLocalError(message: string): ApiError {
    return {
      code: "CLIENT_VALIDATION_ERROR",
      message,
      details: {}
    };
  }

  function isValidPillar(value: string) {
    const trimmed = value.trim();
    return (
      trimmed.length === 2 &&
      heavenlyStems.includes(trimmed[0]) &&
      earthlyBranches.includes(trimmed[1])
    );
  }

  function isSelectedPlaceCurrent() {
    const keyword = geoKeyword.trim();
    const placeName = selectedPlace.name ?? selectedPlace.city;
    return Boolean(
      keyword &&
        (placeName === keyword ||
          selectedPlace.city === keyword ||
          selectedPlace.province === keyword ||
          placeName.includes(keyword) ||
          selectedPlace.city.includes(keyword))
    );
  }

  function validateForm() {
    if (!name.trim()) {
      return makeLocalError("请输入姓名");
    }

    if (isManual) {
      if (!isValidPillar(manualPillars.yearPillar)) {
        return makeLocalError("请输入合法年柱，例如 甲子");
      }
      if (!isValidPillar(manualPillars.monthPillar)) {
        return makeLocalError("请输入合法月柱，例如 丙寅");
      }
      if (!isValidPillar(manualPillars.dayPillar)) {
        return makeLocalError("请输入合法日柱，例如 戊辰");
      }
      if (!unknownBirthHour && !isValidPillar(manualPillars.hourPillar)) {
        return makeLocalError("请输入合法时柱；若不确定，请勾选不确定时辰");
      }
      return null;
    }

    if (!birthDateTime || Number.isNaN(new Date(birthDateTime).getTime())) {
      return makeLocalError("请选择出生时间");
    }
    if (!isSelectedPlaceCurrent()) {
      return makeLocalError("请从地区检索结果中选择出生地区");
    }

    return null;
  }

  async function handleSubmit() {
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setChart(null);
    setAnalysis(null);
    setReport(null);

    const payload = isManual
      ? {
          inputMode,
          birthInput: null,
          manualBaziInput: {
            name: name.trim(),
            gender,
            yearPillar: manualPillars.yearPillar.trim(),
            monthPillar: manualPillars.monthPillar.trim(),
            dayPillar: manualPillars.dayPillar.trim(),
            hourPillar: unknownBirthHour ? null : manualPillars.hourPillar.trim(),
            unknownBirthHour
          }
        }
      : {
          inputMode,
          birthInput: {
            name: name.trim(),
            gender,
            calendarType: inputMode,
            birthDateTime: `${birthDateTime}:00+08:00`,
            isLeapMonth: inputMode === "lunar" ? isLeapMonth : false,
            birthPlace: birthPlaceForRequest(selectedPlace),
            unknownBirthHour
          },
          manualBaziInput: null
        };

    try {
      const result = await apiRequest<BaziChart>("/chart/calculate", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (result.success) {
        setChart(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError({
        code: "NETWORK_ERROR",
        message: "无法连接后端服务，请确认 FastAPI 已启动。",
        details: {}
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function generateAnalysis(currentChart: BaziChart) {
    const result = await apiRequest<AnalysisResult>("/analysis/generate", {
      method: "POST",
      body: JSON.stringify({
        chartId: currentChart.chartId,
        analysisOptions: {
          includeCareer: true,
          includeWealth: true,
          includeRelationship: true,
          includeHealth: true,
          includeHistoryCalibration: false,
          yearsToLookAhead: 3
        }
      })
    });

    if (!result.success) {
      setError(result.error);
      return null;
    }

    setAnalysis(result.data);
    return result.data;
  }

  async function handleGenerateAnalysis() {
    if (!chart) {
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      await generateAnalysis(chart);
    } catch {
      setError({
        code: "NETWORK_ERROR",
        message: "无法生成 AI 解读，请确认后端服务已启动。",
        details: {}
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleGenerateReport() {
    if (!chart) {
      return;
    }

    setIsGeneratingReport(true);
    setError(null);
    try {
      let currentAnalysis = analysis;
      if (!currentAnalysis) {
        setIsAnalyzing(true);
        currentAnalysis = await generateAnalysis(chart);
        setIsAnalyzing(false);
      }
      if (!currentAnalysis) {
        return;
      }

      const result = await apiRequest<PdfReport>("/report/pdf", {
        method: "POST",
        body: JSON.stringify({
          chartId: chart.chartId,
          analysisId: currentAnalysis.analysisId
        })
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setReport(result.data);
      window.open(`${apiOrigin()}${result.data.downloadUrl}`, "_blank", "noopener,noreferrer");
    } catch {
      setError({
        code: "NETWORK_ERROR",
        message: "无法生成 PDF 报告，请确认后端服务已启动。",
        details: {}
      });
    } finally {
      setIsGeneratingReport(false);
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-normal">首页排盘</h1>
      </header>

      <section className="rounded-lg border border-white/10 bg-panel p-6 shadow-2xl">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-white/70">姓名</label>
            <input
              className="h-12 w-full rounded-md border border-white/10 bg-black/20 px-4 text-white outline-none focus:border-gold"
              maxLength={30}
              onChange={(event) => setName(event.target.value)}
              placeholder="请输入姓名"
              value={name}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/70">性别</label>
              <div className="grid h-12 grid-cols-2 rounded-md border border-white/10 bg-black/20 p-1">
                <button
                  className={gender === "male" ? "rounded bg-gold text-black" : "text-white/50"}
                  onClick={() => setGender("male")}
                  type="button"
                >
                  男
                </button>
                <button
                  className={gender === "female" ? "rounded bg-gold text-black" : "text-white/50"}
                  onClick={() => setGender("female")}
                  type="button"
                >
                  女
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/70">输入模式</label>
              <div className="grid h-12 grid-cols-3 rounded-md border border-white/10 bg-black/20 p-1">
                {[
                  ["solar", "公历"],
                  ["lunar", "农历"],
                  ["manual", "四柱"]
                ].map(([mode, label]) => (
                  <button
                    className={inputMode === mode ? "rounded bg-gold text-black" : "text-white/50"}
                    key={mode}
                    onClick={() => setInputMode(mode as InputMode)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isManual ? (
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                ["yearPillar", "年柱"],
                ["monthPillar", "月柱"],
                ["dayPillar", "日柱"],
                ["hourPillar", "时柱"]
              ].map(([field, label]) => (
                <div key={field}>
                  <label className="mb-2 block text-sm text-white/70">{label}</label>
                  <input
                    className="h-12 w-full rounded-md border border-white/10 bg-black/20 px-4 text-white outline-none focus:border-gold"
                    disabled={field === "hourPillar" && unknownBirthHour}
                    maxLength={2}
                    onChange={(event) => updatePillar(field as PillarField, event.target.value)}
                    value={manualPillars[field as PillarField]}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/70">出生时间</label>
                <input
                  className="h-12 w-full rounded-md border border-white/10 bg-black/20 px-4 text-white outline-none focus:border-gold"
                  onChange={(event) => setBirthDateTime(event.target.value)}
                  type="datetime-local"
                  value={birthDateTime}
                />
                {inputMode === "lunar" ? (
                  <label className="mt-3 flex items-center gap-3 text-sm text-white/70">
                    <input
                      checked={isLeapMonth}
                      className="h-4 w-4 accent-gold"
                      onChange={(event) => setIsLeapMonth(event.target.checked)}
                      type="checkbox"
                    />
                    闰月
                  </label>
                ) : null}
              </div>
              <div className="relative">
                <label className="mb-2 block text-sm text-white/70">出生地区</label>
                <input
                  className="h-12 w-full rounded-md border border-white/10 bg-black/20 px-4 text-white outline-none focus:border-gold"
                  maxLength={30}
                  onChange={(event) => setGeoKeyword(event.target.value)}
                  placeholder="输入城市，如 北京、成都"
                  value={geoKeyword}
                />
                <p className="mt-2 text-xs text-white/45">
                  当前：{selectedPlace.name ?? selectedPlace.city}，{selectedPlace.timezone}
                </p>
                {geoResults.length > 0 ? (
                  <div className="absolute left-0 right-0 z-10 mt-2 overflow-hidden rounded-md border border-white/10 bg-[#121212] shadow-2xl">
                    {geoResults.map((place) => (
                      <button
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-white/75 hover:bg-gold/10 hover:text-gold"
                        key={`${place.province}-${place.city}-${place.name ?? place.city}`}
                        onClick={() => selectPlace(place)}
                        type="button"
                      >
                        <span>{place.name ?? place.city}</span>
                        <span className="text-xs text-white/40">
                          {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {geoMessage || isSearchingGeo ? (
                  <p className="mt-2 text-xs text-gold">
                    {isSearchingGeo ? "检索中..." : geoMessage}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 text-sm text-white/70">
            <input
              checked={unknownBirthHour}
              className="h-4 w-4 accent-gold"
              onChange={(event) => setUnknownBirthHour(event.target.checked)}
              type="checkbox"
            />
            不确定时辰
          </label>

          <div className="rounded-md bg-black/20 p-4 text-sm leading-7 text-white/50">
            <p>真太阳时：{isManual ? "四柱模式不计算" : trueSolarPreview}</p>
            <p>
              地址经纬：北纬 {selectedPlace.latitude} 东经 {selectedPlace.longitude}
            </p>
          </div>

          {error ? (
            <div className="rounded-md border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-100">
              {error.message}
            </div>
          ) : null}

          <button
            className="h-14 w-full rounded-full bg-gold text-lg font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !name.trim()}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? "排盘中..." : "开始排盘"}
          </button>
        </div>
      </section>

      {chart ? (
        <section className="mt-6 rounded-lg border border-white/10 bg-panel p-6">
          <div className="mb-4">
            <p className="text-sm text-gold">{chart.chartId}</p>
            <h2 className="text-2xl font-semibold">{chart.profile.name} 的命盘</h2>
            <p className="mt-1 text-sm text-white/50">
              日主：{chart.dayMaster}，农历：{chart.profile.lunarDateText ?? "未提供"}
            </p>
          </div>

          <div className="mb-5 grid gap-3 rounded-md bg-black/20 p-4 text-sm text-white/65 sm:grid-cols-2">
            <p>公历：{chart.profile.solarDateTime ?? "未提供"}</p>
            <p>真太阳时：{chart.profile.trueSolarTime ?? "未提供"}</p>
            <p>出生地：{chart.profile.birthPlaceText ?? "未提供"}</p>
            <p>
              经纬度：
              {chart.profile.latitude != null && chart.profile.longitude != null
                ? `${chart.profile.latitude}, ${chart.profile.longitude}`
                : "未提供"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-center">
              <thead className="text-sm text-white/50">
                <tr>
                  <th className="border border-white/10 p-3">项目</th>
                  <th className="border border-white/10 p-3">年柱</th>
                  <th className="border border-white/10 p-3">月柱</th>
                  <th className="border border-white/10 p-3">日柱</th>
                  <th className="border border-white/10 p-3">时柱</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-white/10 p-3 text-white/50">天干</td>
                  {(["year", "month", "day", "hour"] as const).map((key) => (
                    <td className="border border-white/10 p-3 text-xl font-semibold" key={key}>
                      {chart.pillars[key]?.stem ?? "未知"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-white/10 p-3 text-white/50">地支</td>
                  {(["year", "month", "day", "hour"] as const).map((key) => (
                    <td className="border border-white/10 p-3 text-xl font-semibold" key={key}>
                      {chart.pillars[key]?.branch ?? "未知"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-white/10 p-3 text-white/50">十神</td>
                  {(["year", "month", "day", "hour"] as const).map((key) => (
                    <td className="border border-white/10 p-3" key={key}>
                      {chart.pillars[key]?.tenGod ?? "未知"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-md bg-black/20 p-4 text-sm text-white/70">
            五行统计：{Object.entries(chart.fiveElementStats).map(([key, value]) => `${key}${value}`).join(" / ")}
          </div>

          <div className="mt-4 rounded-md bg-black/20 p-4 text-sm leading-7 text-white/70">
            <p>
              起运：{chart.luckStart.directionText}，{chart.luckStart.startAgeText}
            </p>
            <p>
              依据节气：
              {chart.luckStart.basisSolarTerm
                ? `${chart.luckStart.basisSolarTerm} ${chart.luckStart.basisSolarTermDateTime ?? ""}`
                : "手动四柱估算"}
            </p>
          </div>

          {chart.warnings.length > 0 ? (
            <div className="mt-4 rounded-md border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
              {chart.warnings.join("；")}
            </div>
          ) : null}

          <div className="mt-5 space-y-5">
            <div>
              <h3 className="mb-3 text-lg font-semibold">大运</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-center text-sm">
                  <thead className="text-white/50">
                    <tr>
                      <th className="border border-white/10 p-3">序号</th>
                      <th className="border border-white/10 p-3">顺逆</th>
                      <th className="border border-white/10 p-3">年龄</th>
                      <th className="border border-white/10 p-3">年份</th>
                      <th className="border border-white/10 p-3">天干</th>
                      <th className="border border-white/10 p-3">地支</th>
                      <th className="border border-white/10 p-3">十神</th>
                      <th className="border border-white/10 p-3">当前</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.luckCycles.map((cycle) => (
                      <tr className={cycle.isCurrent ? "bg-gold/10 text-gold" : ""} key={cycle.index}>
                        <td className="border border-white/10 p-3">{cycle.index}</td>
                        <td className="border border-white/10 p-3">{cycle.directionText ?? ""}</td>
                        <td className="border border-white/10 p-3">
                          {cycle.startAge}-{cycle.endAge}
                        </td>
                        <td className="border border-white/10 p-3">
                          {cycle.startYear}-{cycle.endYear}
                        </td>
                        <td className="border border-white/10 p-3">{cycle.stem}</td>
                        <td className="border border-white/10 p-3">{cycle.branch}</td>
                        <td className="border border-white/10 p-3">
                          {cycle.tenGodStem ?? ""}/{cycle.tenGodBranch ?? ""}
                        </td>
                        <td className="border border-white/10 p-3">{cycle.isCurrent ? "是" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">流年</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-center text-sm">
                  <thead className="text-white/50">
                    <tr>
                      <th className="border border-white/10 p-3">年份</th>
                      <th className="border border-white/10 p-3">年龄</th>
                      <th className="border border-white/10 p-3">天干</th>
                      <th className="border border-white/10 p-3">地支</th>
                      <th className="border border-white/10 p-3">十神</th>
                      <th className="border border-white/10 p-3">当前</th>
                      <th className="border border-white/10 p-3">提示</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.annualCycles.map((cycle) => (
                      <tr className={cycle.isCurrent ? "bg-gold/10 text-gold" : ""} key={cycle.year}>
                        <td className="border border-white/10 p-3">{cycle.year}</td>
                        <td className="border border-white/10 p-3">{cycle.age ?? ""}</td>
                        <td className="border border-white/10 p-3">{cycle.stem}</td>
                        <td className="border border-white/10 p-3">{cycle.branch}</td>
                        <td className="border border-white/10 p-3">
                          {cycle.tenGodStem ?? ""}/{cycle.tenGodBranch ?? ""}
                        </td>
                        <td className="border border-white/10 p-3">{cycle.isCurrent ? "是" : ""}</td>
                        <td className="border border-white/10 p-3">{cycle.relationSummary || "待解读"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">流月</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-center text-sm">
                  <thead className="text-white/50">
                    <tr>
                      <th className="border border-white/10 p-3">序号</th>
                      <th className="border border-white/10 p-3">节气</th>
                      <th className="border border-white/10 p-3">日期</th>
                      <th className="border border-white/10 p-3">天干</th>
                      <th className="border border-white/10 p-3">地支</th>
                      <th className="border border-white/10 p-3">十神</th>
                      <th className="border border-white/10 p-3">当前</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.monthlyCycles.map((cycle) => (
                      <tr className={cycle.isCurrent ? "bg-gold/10 text-gold" : ""} key={cycle.index}>
                        <td className="border border-white/10 p-3">{cycle.index}</td>
                        <td className="border border-white/10 p-3">{cycle.solarTerm}</td>
                        <td className="border border-white/10 p-3">{cycle.solarTermDate}</td>
                        <td className="border border-white/10 p-3">{cycle.stem}</td>
                        <td className="border border-white/10 p-3">{cycle.branch}</td>
                        <td className="border border-white/10 p-3">
                          {cycle.tenGodStem ?? ""}/{cycle.tenGodBranch ?? ""}
                        </td>
                        <td className="border border-white/10 p-3">{cycle.isCurrent ? "是" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              className="h-12 rounded-md border border-gold/40 text-gold disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isAnalyzing || isGeneratingReport}
              onClick={handleGenerateAnalysis}
              type="button"
            >
              {isAnalyzing ? "解读生成中..." : "生成 AI 解读"}
            </button>
            <button
              className="h-12 rounded-md bg-gold font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGeneratingReport || isAnalyzing}
              onClick={handleGenerateReport}
              type="button"
            >
              {isGeneratingReport ? "PDF 生成中..." : "下载 PDF 报告"}
            </button>
          </div>

          {analysis ? (
            <div className="mt-5 space-y-4 rounded-md bg-black/20 p-4 text-sm leading-7 text-white/70">
              <div>
                <p className="text-gold">
                  {analysis.status === "fallback" ? "本地摘要解读" : "AI 解读"}
                </p>
                <p className="text-xs text-white/45">
                  {analysis.analysisId}
                  {analysis.modelName ? ` · ${analysis.modelName}` : ""}
                </p>
                <p>{analysis.summary}</p>
              </div>
              {analysis.sections.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-1 font-semibold text-white">{section.title}</h3>
                  <p>{section.content}</p>
                </div>
              ))}
              {analysis.warnings.length > 0 ? (
                <p className="text-gold">{analysis.warnings.join("；")}</p>
              ) : null}
              <p className="border-t border-white/10 pt-3 text-white/50">{analysis.disclaimer}</p>
            </div>
          ) : null}

          {report ? (
            <div className="mt-4 rounded-md border border-emerald-400/30 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              PDF 已生成：
              <a
                className="ml-1 underline decoration-emerald-200/50 underline-offset-4"
                href={`${apiOrigin()}${report.downloadUrl}`}
                rel="noreferrer"
                target="_blank"
              >
                {report.fileName}
              </a>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
