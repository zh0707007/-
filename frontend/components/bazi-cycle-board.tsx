"use client";

import { useMemo, useState } from "react";

import type { BaziChart } from "@/types/api";

const HEAVENLY_STEMS = "甲乙丙丁戊己庚辛壬癸".split("");
const EARTHLY_BRANCHES = "子丑寅卯辰巳午未申酉戌亥".split("");

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

const TEN_GOD_SHORT: Record<string, string> = {
  七杀: "杀",
  伤官: "伤",
  偏印: "枭",
  偏财: "才",
  劫财: "劫",
  正印: "印",
  正官: "官",
  正财: "财",
  比肩: "比",
  食神: "食",
};

export function BaziCycleBoard({ chart }: { chart: BaziChart }) {
  const luckCycles = chart.luckCycles;
  const monthlyCycles = chart.monthlyCycles;
  const currentLuck = useMemo(
    () => luckCycles.find((cycle) => cycle.isCurrent) ?? luckCycles[0] ?? null,
    [luckCycles]
  );
  const [selectedLuckIndex, setSelectedLuckIndex] = useState(currentLuck?.index ?? 0);
  const selectedLuck =
    luckCycles.find((cycle) => cycle.index === selectedLuckIndex) ?? currentLuck ?? luckCycles[0] ?? null;
  const selectedYears = selectedLuck ? yearsForLuckCycle(selectedLuck.startYear, selectedLuck.endYear) : [];
  const luckGrid = {
    gridTemplateColumns: `52px repeat(${Math.max(luckCycles.length, 1)}, 56px)`,
  };
  const annualGrid = {
    gridTemplateColumns: `52px repeat(${Math.max(selectedYears.length, 1)}, 56px)`,
  };
  const monthGrid = {
    gridTemplateColumns: `52px repeat(${Math.max(monthlyCycles.length, 1)}, 56px)`,
  };

  return (
    <section
      className="mt-5 overflow-hidden rounded-md border border-[#e6e0d7] bg-[#fffdf8] shadow-sm"
      data-testid="bazi-cycle-board"
    >
      <div className="overflow-x-auto">
        <div className="min-w-max text-[#2f2f2f]">
          <div className="grid border-b border-[#ece6dc]" style={luckGrid}>
            <button
              className="flex min-h-[104px] flex-col items-center justify-center gap-2 border-r border-[#d8d0c6] bg-white px-1.5 text-[#9b9b9b] transition hover:bg-[#f7f3ea]"
              onClick={() => setSelectedLuckIndex(currentLuck?.index ?? luckCycles[0]?.index ?? 0)}
              type="button"
            >
              <div className="text-xl leading-tight [writing-mode:vertical-rl]">大运</div>
              <div className="h-5 w-9 rounded-full bg-gold/80 p-0.5">
                <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
              </div>
            </button>
            {luckCycles.map((cycle) => (
              <button
                className={`border-r border-[#ece6dc] px-1 py-2 text-center ${
                  cycle.index === selectedLuckIndex
                    ? "bg-[#e9e9e9]"
                    : cycle.isCurrent
                      ? "bg-[#f1f1f1]"
                      : "bg-white"
                }`}
                key={cycle.index}
                onClick={() => setSelectedLuckIndex(cycle.index)}
                type="button"
              >
                <p className="text-lg leading-none">{cycle.startYear}</p>
                <p className="mt-1 text-xs">{cycle.startAge}岁</p>
                <div className="mt-2 space-y-0.5 text-xl leading-none">
                  <StemGod god={cycle.tenGodStem} stem={cycle.stem} />
                  <BranchGod branch={cycle.branch} dayMaster={chart.dayMaster} god={cycle.tenGodBranch} />
                </div>
              </button>
            ))}
          </div>

          <div className="grid border-b border-[#ece6dc]" style={annualGrid}>
            <div className="grid border-r border-[#d8d0c6] bg-white text-[#9b9b9b]">
              <div className="flex items-center justify-center text-xl [writing-mode:vertical-rl]">流年</div>
              <div className="flex items-center justify-center text-sm [writing-mode:vertical-rl]">小运</div>
            </div>
            {selectedYears.map((year) => (
              <div
                className={`border-r border-[#ece6dc] px-1 py-2 text-center ${
                  isCurrentAnnual(chart, year) ? "bg-[#e9e9e9]" : "bg-white"
                }`}
                key={`annual-${selectedLuck?.index ?? "none"}-${year}`}
              >
                <p className="text-lg leading-none">{year}</p>
                <div className="mt-2 space-y-0.5 text-xl leading-none">
                  <AnnualStemGod dayMaster={chart.dayMaster} year={year} />
                  <AnnualBranchGod dayMaster={chart.dayMaster} year={year} />
                  <SmallLuckStemBranch chart={chart} year={year} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid" style={monthGrid}>
            <div className="flex items-center justify-center border-r border-[#d8d0c6] bg-white px-1.5 text-xl text-[#9b9b9b] [writing-mode:vertical-rl]">
              流月
            </div>
            {monthlyCycles.map((cycle) => (
              <div
                className={`border-r border-[#ece6dc] px-1 py-2 text-center ${
                  cycle.isCurrent ? "bg-[#ededed]" : "bg-white"
                }`}
                key={cycle.index}
              >
                <p className="text-sm leading-none">{cycle.solarTerm}</p>
                <p className="mt-1 text-xs leading-none">{shortDate(cycle.solarTermDate)}</p>
                <div className="mt-2 space-y-0.5 text-lg leading-none">
                  <StemGod god={cycle.tenGodStem} stem={cycle.stem} />
                  <BranchGod branch={cycle.branch} dayMaster={chart.dayMaster} god={cycle.tenGodBranch} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StemGod({ god, stem }: { god?: string | null; stem: string }) {
  return (
    <p>
      <span style={{ color: colorForStem(stem) }}>{stem}</span>
      <span className="text-[#333]">{shortGod(god)}</span>
    </p>
  );
}

function BranchGod({
  branch,
  dayMaster,
  god,
}: {
  branch: string;
  dayMaster: string;
  god?: string | null;
}) {
  return (
    <p>
      <span style={{ color: colorForBranch(branch) }}>{branch}</span>
      <span className="text-[#333]">{shortGod(god ?? tenGodForBranch(dayMaster, branch))}</span>
    </p>
  );
}

function AnnualStemGod({ dayMaster, year }: { dayMaster: string; year: number }) {
  const { branch, stem } = yearStemBranch(year);
  return (
    <p>
      <span style={{ color: colorForStem(stem) }}>{stem}</span>
      <span className="text-[#333]">{shortGod(tenGodForStem(dayMaster, stem))}</span>
      <span className="sr-only">{branch}</span>
    </p>
  );
}

function AnnualBranchGod({ dayMaster, year }: { dayMaster: string; year: number }) {
  const { branch, stem } = yearStemBranch(year);
  return (
    <p>
      <span className="sr-only">{stem}</span>
      <span style={{ color: colorForBranch(branch) }}>{branch}</span>
      <span className="text-[#333]">{shortGod(tenGodForBranch(dayMaster, branch))}</span>
    </p>
  );
}

function SmallLuckStemBranch({ chart, year }: { chart: BaziChart; year: number }) {
  const pillar = chart.pillars.hour ?? chart.pillars.day;
  const birthYear = birthYearFromChart(chart) ?? chart.annualCycles[0]?.year ?? year;
  const age = Math.max(1, year - birthYear + 1);
  const baseIndex = jiaziIndex(pillar.stem, pillar.branch) ?? jiaziIndex(chart.pillars.day.stem, chart.pillars.day.branch) ?? 0;
  const direction = chart.luckStart.direction === "backward" ? -1 : 1;
  const smallLuck = jiaziByIndex(baseIndex + direction * age);
  return (
    <p>
      <span style={{ color: colorForStem(smallLuck.stem) }}>{smallLuck.stem}</span>
      <span style={{ color: colorForBranch(smallLuck.branch) }}>{smallLuck.branch}</span>
    </p>
  );
}

function yearsForLuckCycle(startYear: number, endYear: number) {
  const years: number[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year);
  }
  return years.slice(0, 10);
}

function yearStemBranch(year: number) {
  const stemIndex = positiveMod(year - 4, 10);
  const branchIndex = positiveMod(year - 4, 12);
  return {
    branch: EARTHLY_BRANCHES[branchIndex],
    stem: HEAVENLY_STEMS[stemIndex],
  };
}

function jiaziByIndex(index: number) {
  return {
    branch: EARTHLY_BRANCHES[positiveMod(index, 12)],
    stem: HEAVENLY_STEMS[positiveMod(index, 10)],
  };
}

function jiaziIndex(stem: string, branch: string) {
  const stemIndex = HEAVENLY_STEMS.indexOf(stem);
  const branchIndex = EARTHLY_BRANCHES.indexOf(branch);
  if (stemIndex < 0 || branchIndex < 0) {
    return null;
  }
  for (let index = 0; index < 60; index += 1) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) {
      return index;
    }
  }
  return null;
}

function birthYearFromChart(chart: BaziChart) {
  const solarYear = chart.profile.solarDateTime?.slice(0, 4);
  if (solarYear && /^\d{4}$/.test(solarYear)) {
    return Number(solarYear);
  }
  const lunarMatch = chart.profile.lunarDateText?.match(/^(\d{4})年/);
  return lunarMatch ? Number(lunarMatch[1]) : null;
}

function isCurrentAnnual(chart: BaziChart, year: number) {
  return chart.annualCycles.some((cycle) => cycle.year === year && cycle.isCurrent);
}

function positiveMod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function shortDate(value: string) {
  const [, month, day] = value.match(/^\d{4}-(\d{2})-(\d{2})/) ?? [];
  if (!month || !day) {
    return value;
  }
  return `${Number(month)}/${Number(day)}`;
}

function shortGod(god?: string | null) {
  if (!god) {
    return "";
  }
  return TEN_GOD_SHORT[god] ?? god.slice(0, 1);
}

function tenGodForStem(dayMaster: string, stem: string) {
  return TEN_GODS_BY_DAY_STEM[dayMaster]?.[stem] ?? "";
}

function tenGodForBranch(dayMaster: string, branch: string) {
  const hiddenStem = BRANCH_HIDDEN_STEMS[branch]?.[0];
  return hiddenStem ? tenGodForStem(dayMaster, hiddenStem) : "";
}

function colorForStem(stem: string) {
  return ELEMENT_COLORS[STEM_ELEMENTS[stem]] ?? "#4b5563";
}

function colorForBranch(branch: string) {
  return ELEMENT_COLORS[BRANCH_ELEMENTS[branch]] ?? "#4b5563";
}
