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
  luckCycles: unknown[];
  annualCycles: unknown[];
  monthlyCycles: unknown[];
  warnings: string[];
};
