import type { AnalysisResult, BaziChart, Pillar } from "@/types/api";

const elementColors: Record<string, string> = {
  木: "#2f9d55",
  火: "#c9231f",
  土: "#9a741a",
  金: "#b6922e",
  水: "#2374bd",
};

type BaziPortraitProps = {
  chart: BaziChart;
  analysis?: AnalysisResult | null;
  compact?: boolean;
};

export function BaziPortrait({ chart, analysis, compact = false }: BaziPortraitProps) {
  const stats = chart.fiveElementStats ?? {};
  const entries = Object.entries(stats);
  const dominant = entries.length
    ? entries.reduce((best, current) => (current[1] > best[1] ? current : best))[0]
    : "土";
  const weak = entries.length
    ? entries.reduce((best, current) => (current[1] < best[1] ? current : best))[0]
    : "水";
  const dominantColor = elementColors[dominant] ?? elementColors["土"];
  const weakColor = elementColors[weak] ?? elementColors["水"];
  const pillars = pillarTexts(chart);
  const summary =
    analysis?.imagePromptSummary?.trim() ||
    `日主 ${chart.dayMaster}，${dominant}势较显，${weak}气需调。`;
  const width = compact ? 112 : 150;
  const height = compact ? 148 : 196;

  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <svg
        aria-label={`${chart.profile.name} 八字画像`}
        className="block rounded-md border border-white/10 shadow-sm"
        height={height}
        role="img"
        viewBox="0 0 320 420"
        width={width}
      >
        <rect fill="#15120d" height="420" width="320" />
        <rect fill="#21170d" height="268" width="320" y="0" />
        <rect fill="#0c2230" height="152" width="320" y="268" />

        <circle cx="160" cy="96" fill={dominantColor} r="30" />
        <circle cx="160" cy="96" fill="#ffd95c" opacity="0.32" r="48" />
        <text fill="#2b1c0f" fontSize="18" fontWeight="700" textAnchor="middle" x="160" y="102">
          {dominant}
        </text>

        <path d="M48 268 L134 180 L218 268 L282 210 L320 268 Z" fill="#6f4f24" />
        <rect fill="#6f4f24" height="55" width="320" y="268" />

        {[0, 10, 20].map((offset) => (
          <path
            d={`M-10 ${352 + offset} C86 ${386 + offset} 186 ${322 + offset} 330 ${366 + offset}`}
            fill="none"
            key={offset}
            stroke={weakColor}
            strokeLinecap="round"
            strokeWidth="4"
          />
        ))}

        <path d="M86 322 L108 218" stroke="#244f2b" strokeLinecap="round" strokeWidth="10" />
        <circle cx="84" cy="206" fill="#2d6d3b" r="30" />
        <circle cx="112" cy="194" fill="#2f7a42" r="36" />
        <circle cx="140" cy="214" fill="#2d6d3b" r="28" />

        {pillars.map((pillar, index) => (
          <text fill="#d9b36a" fontSize="18" key={`${pillar}-${index}`} x="22" y={45 + index * 30}>
            {pillar}
          </text>
        ))}

        <text fill="#ecd48f" fontSize="28" fontWeight="700" textAnchor="middle" x="160" y="302">
          {chart.dayMaster}
        </text>

        <rect fill="#e7d4ac" height="68" width="320" y="352" />
        <rect fill="none" height="60" stroke="#8e7047" width="312" x="4" y="356" />
        <text fill="#3e2a17" fontSize="14" fontWeight="700" textAnchor="middle" x="160" y="380">
          八字：{pillars.join("  ")}
        </text>
        <text fill="#3e2a17" fontSize="12" textAnchor="middle" x="160" y="400">
          日主 {chart.dayMaster}，{dominant}势较显，{weak}气需调
        </text>
      </svg>
      <figcaption className="max-w-[150px] text-center text-xs leading-5 text-white/45">
        {summary.slice(0, 28)}
      </figcaption>
    </figure>
  );
}

function pillarTexts(chart: BaziChart) {
  return (["year", "month", "day", "hour"] as const)
    .map((key) => chart.pillars[key])
    .filter((pillar): pillar is Pillar => Boolean(pillar))
    .map((pillar) => `${pillar.stem}${pillar.branch}`);
}
