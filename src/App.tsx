import { lazy, useEffect } from "react";
import { AppShell } from "./app/AppShell";
import { ProgramDraftProvider } from "./hooks/useProgramDraft";

const RecommendationIntakePage = lazy(() =>
  import("./features/recommendation-intake").then((module) => ({
    default: module.RecommendationIntakePage,
  }))
);

const RecommendationSummaryPage = lazy(() =>
  import("./features/recommendation-summary").then((module) => ({
    default: module.RecommendationSummaryPage,
  }))
);

export default function App() {
  useEffect(() => {
    const preload = () => {
      void import("./features/recommendation-intake");
      void import("./features/recommendation-summary");
    };

    const timeoutId = window.setTimeout(preload, 300);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <ProgramDraftProvider>
      <AppShell
        pages={{
          recommendation: RecommendationIntakePage,
          recommendation_summary: RecommendationSummaryPage,
        }}
      />
    </ProgramDraftProvider>
  );
}
