"use client";

import { useMemo, useState } from "react";

import { apiRequest } from "@/lib/api/client";
import type { ApiError, BaziChart, Gender, InputMode } from "@/types/api";

const defaultPlace = {
  province: "北京市",
  city: "北京市",
  latitude: 39.9042,
  longitude: 116.4074,
  timezone: "Asia/Shanghai"
};

type PillarField = "yearPillar" | "monthPillar" | "dayPillar" | "hourPillar";

export default function HomePage() {
  const [name, setName] = useState("张三");
  const [gender, setGender] = useState<Gender>("male");
  const [inputMode, setInputMode] = useState<InputMode>("solar");
  const [birthDateTime, setBirthDateTime] = useState("1990-01-01T00:00");
  const [unknownBirthHour, setUnknownBirthHour] = useState(false);
  const [manualPillars, setManualPillars] = useState({
    yearPillar: "己巳",
    monthPillar: "丙子",
    dayPillar: "丙寅",
    hourPillar: "戊子"
  });
  const [chart, setChart] = useState<BaziChart | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManual = inputMode === "manual";
  const trueSolarPreview = useMemo(() => {
    const parsed = new Date(birthDateTime);
    if (Number.isNaN(parsed.getTime())) {
      return "待计算";
    }
    const offsetMinutes = (defaultPlace.longitude - 120) * 4;
    return new Date(parsed.getTime() + offsetMinutes * 60 * 1000).toLocaleString("zh-CN", {
      hour12: false
    });
  }, [birthDateTime]);

  function updatePillar(field: PillarField, value: string) {
    setManualPillars((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    setChart(null);

    const payload = isManual
      ? {
          inputMode,
          birthInput: null,
          manualBaziInput: {
            name,
            gender,
            ...manualPillars,
            hourPillar: unknownBirthHour ? null : manualPillars.hourPillar,
            unknownBirthHour
          }
        }
      : {
          inputMode,
          birthInput: {
            name,
            gender,
            calendarType: inputMode,
            birthDateTime: `${birthDateTime}:00+08:00`,
            isLeapMonth: false,
            birthPlace: defaultPlace,
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
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/70">出生地区</label>
                <div className="h-12 rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white/70">
                  北京市 北京时间
                </div>
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
              地址经纬：北纬 {defaultPlace.latitude} 东经 {defaultPlace.longitude}
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

          {chart.warnings.length > 0 ? (
            <div className="mt-4 rounded-md border border-gold/30 bg-gold/10 p-4 text-sm text-gold">
              {chart.warnings.join("；")}
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
