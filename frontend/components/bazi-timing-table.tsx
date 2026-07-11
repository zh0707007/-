import type { ReactNode } from "react";

import type { BaziChart } from "@/types/api";

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
  branch?: string | null;
  helper?: string;
  hiddenItems: string[];
  key: string;
  label: string;
  mainStar: string;
  stem?: string | null;
};

export function BaziTimingTable({ chart }: { chart: BaziChart }) {
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
      <div className="flex items-center px-1.5 text-base font-normal text-[#929292]">{label}</div>
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
  const referenceIndex = 19;
  const index = (referenceIndex + offset + 60) % 60;
  return {
    branch: branches[index % 12],
    date: today.toISOString().slice(0, 10),
    isCurrent: true,
    relationSummary: "",
    stem: stems[index % 10],
    tenGodBranch: null,
    tenGodStem: null,
  };
}
