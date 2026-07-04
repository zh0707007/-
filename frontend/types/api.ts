export type ApiError = {
  code: string;
  message: string;
  details: Record<string, unknown>;
};

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      requestId: string;
    }
  | {
      success: false;
      error: ApiError;
      requestId: string;
    };

export type Gender = "male" | "female";
export type InputMode = "solar" | "lunar" | "manual";

export type BirthPlace = {
  name?: string;
  province: string;
  city: string;
  district?: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type Pillar = {
  stem: string;
  branch: string;
  tenGod: string;
  hiddenStems: string[];
  secondaryStars: string[];
  starFortune?: string;
  selfSitting?: string;
  voidBranch?: string;
  nayin?: string;
  shensha: string[];
};

export type LuckCycle = {
  index: number;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  stem: string;
  branch: string;
  tenGodStem?: string | null;
  tenGodBranch?: string | null;
  direction?: "forward" | "backward" | string;
  directionText?: string;
  isCurrent: boolean;
};

export type AnnualCycle = {
  year: number;
  age?: number | null;
  stem: string;
  branch: string;
  tenGodStem?: string | null;
  tenGodBranch?: string | null;
  isCurrent: boolean;
  relationSummary?: string;
};

export type MonthlyCycle = {
  index: number;
  solarTerm: string;
  solarTermDate: string;
  stem: string;
  branch: string;
  tenGodStem?: string | null;
  tenGodBranch?: string | null;
  relationSummary?: string;
  isCurrent: boolean;
};

export type LuckStart = {
  direction: "forward" | "backward" | string;
  directionText: string;
  basisSolarTerm?: string | null;
  basisSolarTermDateTime?: string | null;
  startAge: number;
  startAgeYears: number;
  startAgeMonths: number;
  startAgeText: string;
  isEstimated: boolean;
};

export type BaziChart = {
  chartId: string;
  profile: {
    name: string;
    gender: Gender;
    solarDateTime?: string | null;
    lunarDateText?: string | null;
    trueSolarTime?: string | null;
    birthPlaceText?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour?: Pillar | null;
  };
  dayMaster: string;
  fiveElementStats: Record<string, number>;
  luckStart: LuckStart;
  luckCycles: LuckCycle[];
  annualCycles: AnnualCycle[];
  monthlyCycles: MonthlyCycle[];
  warnings: string[];
};

export type AnalysisResult = {
  analysisId: string;
  chartId: string;
  status: "completed" | "fallback" | string;
  modelName?: string | null;
  summary: string;
  sections: {
    title: string;
    content: string;
  }[];
  imagePromptSummary: string;
  disclaimer: string;
  warnings: string[];
};

export type PdfReport = {
  reportId: string;
  chartId: string;
  analysisId: string;
  fileName: string;
  downloadUrl: string;
  expiresAt: string;
  status: "ready" | string;
};
