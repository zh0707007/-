import type { AnalysisResult } from "@/types/api";

export type AnalysisTopic = {
  slug: string;
  title: string;
  subtitle: string;
  sectionTitles: string[];
  focusItems: string[];
};

export const analysisTopics: AnalysisTopic[] = [
  {
    slug: "yongshen",
    title: "用神分析与排序",
    subtitle: "梳理调候、扶抑、通关与五行取用顺序。",
    sectionTitles: ["二、用神分析与排序"],
    focusItems: ["五行强弱", "调候优先级", "喜忌排序", "大运配合"],
  },
  {
    slug: "shishen",
    title: "十神分析",
    subtitle: "拆解十神透干、藏干、组合关系与命局结构。",
    sectionTitles: ["三、十神分析"],
    focusItems: ["透干关系", "藏干根气", "官杀印财", "组合成格"],
  },
  {
    slug: "personality",
    title: "性格特征",
    subtitle: "从日主、十神、五行偏性观察性格底色。",
    sectionTitles: ["四、性格特征"],
    focusItems: ["性格核心", "优势倾向", "压力来源", "修正方向"],
  },
  {
    slug: "career-wealth",
    title: "事业与财富",
    subtitle: "合并事业方向与财富路径，观察能力变现节奏。",
    sectionTitles: ["五、事业方向", "六、个人财富"],
    focusItems: ["适合行业", "能力模型", "财富路径", "风险边界"],
  },
  {
    slug: "relationship",
    title: "婚姻情感",
    subtitle: "以配偶星、婚姻宫和流年互动分析情感节奏。",
    sectionTitles: ["七、婚姻感情"],
    focusItems: ["情感模式", "伴侣画像", "关系波动", "年份提示"],
  },
  {
    slug: "health",
    title: "身体健康",
    subtitle: "依据五行偏枯和大运流年给出生活节奏提醒。",
    sectionTitles: ["八、身体健康"],
    focusItems: ["五行偏性", "作息节奏", "压力反应", "中性提醒"],
  },
  {
    slug: "cities",
    title: "发展城市",
    subtitle: "结合喜用五行、产业环境和城市气候做方向筛选。",
    sectionTitles: ["九、适合发展的城市"],
    focusItems: ["城市五行", "产业匹配", "气候环境", "迁移建议"],
  },
];

export function getAnalysisTopic(slug: string | string[] | undefined) {
  const normalized = Array.isArray(slug) ? slug[0] : slug;
  return analysisTopics.find((topic) => topic.slug === normalized);
}

export function getTopicSections(analysis: AnalysisResult, topic: AnalysisTopic) {
  return topic.sectionTitles
    .map((title) =>
      analysis.sections.find((section) => section.title === title || section.title.startsWith(title))
    )
    .filter((section): section is AnalysisResult["sections"][number] => Boolean(section));
}
