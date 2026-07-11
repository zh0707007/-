import { Suspense } from "react";

import AnalysisTopicClient from "./topic-client";

export default function AnalysisTopicPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-8 text-white/70">
          专题加载中...
        </main>
      }
    >
      <AnalysisTopicClient />
    </Suspense>
  );
}
