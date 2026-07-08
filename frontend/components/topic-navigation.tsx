"use client";

import Link from "next/link";

import { analysisTopics } from "@/lib/analysis/topics";
import { ThemeToggle } from "@/components/theme-toggle";

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

  return (
    <nav className="mb-6 flex flex-col gap-3 rounded-lg border border-white/10 bg-panel px-3 py-3 shadow-2xl sm:flex-row sm:items-center">
      <Link
        className={`flex h-10 shrink-0 items-center rounded-md px-4 text-sm font-semibold transition ${
          activeSlug ? "text-white/65 hover:text-gold" : "bg-gold text-black"
        }`}
        href="/"
      >
        首页
      </Link>

      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="flex w-max gap-2 pr-1">
          {analysisTopics.map((topic) =>
            canOpenTopics ? (
              <Link
                className={`flex h-10 items-center whitespace-nowrap rounded-md border px-3 text-sm transition ${
                  activeSlug === topic.slug
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-white/10 bg-black/20 text-white/65 hover:border-gold/40 hover:text-gold"
                }`}
                href={`/analysis/${topic.slug}?chartId=${chartId}&analysisId=${analysisId}`}
                key={topic.slug}
              >
                {topic.title}
              </Link>
            ) : (
              <button
                className="flex h-10 items-center whitespace-nowrap rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white/45 transition hover:border-gold/30 hover:text-gold"
                key={topic.slug}
                onClick={onBlockedTopicClick}
                type="button"
              >
                {topic.title}
              </button>
            )
          )}
        </div>
      </div>

      <ThemeToggle />
    </nav>
  );
}
