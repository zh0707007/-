"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { analysisTopics } from "@/lib/analysis/topics";
import { NavIcon } from "@/components/nav-icon";

type TopicNavigationProps = {
  chartId?: string | null;
  analysisId?: string | null;
  activeSlug?: string;
  onBlockedTopicClick?: () => void;
};

export function TopicNavigation({
  chartId,
  analysisId,
  activeSlug,
  onBlockedTopicClick,
}: TopicNavigationProps) {
  const canOpenTopics = Boolean(chartId && analysisId);
  const pathname = usePathname();
  const itemClass = (active: boolean) =>
    `flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] font-medium transition-[background-color,color,transform] duration-150 active:scale-95 lg:min-h-12 ${
      active ? "bg-white text-gold shadow-[0_8px_20px_rgba(31,41,55,0.08)]" : "text-black/70 hover:bg-white/70 hover:text-gold"
    }`;
  const marker = (active: boolean) => (
    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? "border-gold bg-gold" : "border-black/20 bg-white"}`}>
      {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
    </span>
  );

  return (
    <aside className="flex border-white/10 bg-[#f1f3f7] text-[#1f2937] shadow-[inset_-1px_0_0_rgba(99,78,44,0.14)] lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:overflow-y-auto">
      <div className="flex min-w-0 flex-1 flex-col lg:min-h-screen">
        <div className="flex items-center gap-3 border-b border-black/10 px-5 py-5 lg:flex-col lg:items-center lg:px-8 lg:py-12 lg:text-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold text-lg font-semibold text-black shadow-[0_8px_22px_rgba(151,103,30,0.22)]">
            命
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold lg:mt-4 lg:whitespace-normal">八字测算平台</h1>
            <p className="mt-1 truncate text-xs text-black/45 lg:whitespace-normal">四柱排盘、AI 解读与 PDF 报告</p>
          </div>
        </div>

        <nav className="min-w-0 flex-1 overflow-x-auto border-b border-black/10 px-4 py-4 lg:overflow-visible lg:border-b-0 lg:px-5 lg:py-6">
          <p className="mb-4 hidden text-[15px] font-medium text-black/70 lg:block">导航菜单</p>
          <div className="flex w-max gap-2 lg:grid lg:w-auto lg:gap-1">
            <Link className={itemClass(pathname === "/" && !activeSlug)} href="/">
              {marker(pathname === "/" && !activeSlug)}
              <span className="flex min-w-[112px] items-center gap-2 lg:min-w-0">
                <NavIcon active={pathname === "/" && !activeSlug} name="home" />
                <span className="whitespace-nowrap">首页排盘</span>
              </span>
            </Link>
            {analysisTopics.map((topic) =>
              canOpenTopics ? (
                <Link
                  className={itemClass(activeSlug === topic.slug)}
                  href={`/analysis/${topic.slug}?chartId=${chartId}&analysisId=${analysisId}`}
                  key={topic.slug}
                >
                  {marker(activeSlug === topic.slug)}
                  <span className="flex min-w-[112px] items-center gap-2 lg:min-w-0">
                    <NavIcon active={activeSlug === topic.slug} name="analysis" />
                    <span className="whitespace-nowrap">{topic.title}</span>
                  </span>
                </Link>
              ) : (
                <button
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] font-medium text-black/35 transition-[background-color,color,transform] duration-150 hover:bg-white/60 hover:text-gold active:scale-95 lg:min-h-12"
                  key={topic.slug}
                  onClick={onBlockedTopicClick}
                  type="button"
                >
                  {marker(false)}
                  <span className="flex min-w-[112px] items-center gap-2 lg:min-w-0">
                    <NavIcon name="analysis" />
                    <span className="whitespace-nowrap">{topic.title}</span>
                  </span>
                </button>
              )
            )}
            <Link className={itemClass(pathname === "/member")} href="/member">
              {marker(pathname === "/member")}
              <span className="flex min-w-[112px] items-center gap-2 lg:min-w-0">
                <NavIcon active={pathname === "/member"} name="user" />
                <span className="whitespace-nowrap">用户中心</span>
              </span>
            </Link>
          </div>
        </nav>

        <div className="hidden border-t border-black/10 px-8 py-6 text-xs text-black/40 lg:block">
          <p>v1.0.0 · 八字测算平台</p>
        </div>
      </div>
    </aside>
  );
}
