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

export type DailyCycle = {
  date: string;
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
  dailyCycle?: DailyCycle | null;
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

export type TopicAnalysisResult = {
  topicAnalysisId: string;
  chartId: string;
  analysisId?: string | null;
  topicSlug: string;
  title: string;
  status: "completed" | "fallback" | string;
  modelName?: string | null;
  summary: string;
  keyPoints: string[];
  sections: {
    title: string;
    content: string;
  }[];
  pdfExcerpt: string;
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

export type UserPublic = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | string;
  isActive: boolean;
  createdAt: string;
};

export type AuthSession = {
  token: string;
  expiresAt: string;
  user: UserPublic;
};

export type PlatformSession = AuthSession;

export type MembershipPlan = {
  code: string;
  name: string;
  price: number;
  currency: string;
  quota: number;
  description: string;
};

export type MembershipPublic = {
  id: string;
  tier: string;
  status: string;
  startedAt: string;
  expiresAt?: string | null;
  quota: number;
};

export type TenantPublic = {
  id: string;
  name: string;
  ownerUserId: string;
  plan: string;
  status: string;
  createdAt: string;
};

export type ClientProfilePublic = {
  id: string;
  ownerUserId: string;
  tenantId?: string | null;
  name: string;
  gender: string;
  birthSummary: string;
  chartId?: string | null;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type OrderPublic = {
  id: string;
  productCode: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  paymentProvider: string;
  paymentUrl?: string | null;
  createdAt: string;
  paidAt?: string | null;
};

export type CommunityPostPublic = {
  id: string;
  userId: string;
  title: string;
  content: string;
  visibility: string;
  shareUrl?: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

export type CommunityCommentPublic = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
};

export type AdminOverview = {
  users: number;
  tenants: number;
  orders: number;
  paidOrders: number;
  profiles: number;
  posts: number;
};
