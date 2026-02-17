import { lazy, useEffect } from "react";
import { AppShell } from "@/app/AppShell";
import { ProgramDraftProvider } from "@/hooks/useProgramDraft";

const ProgramBuilderPage = lazy(() =>
  import("@/features/program-builder").then((module) => ({ default: module.ProgramBuilderPage }))
);
const ProgramDetailsPage = lazy(() =>
  import("@/features/program-details").then((module) => ({ default: module.ProgramDetailsPage }))
);
const RecommendationIntakePage = lazy(() =>
  import("@/features/recommendation-intake").then((module) => ({ default: module.RecommendationIntakePage }))
);
const RecommendationSummaryPage = lazy(() =>
  import("@/features/recommendation-summary").then((module) => ({
    default: module.RecommendationSummaryPage,
  }))
);

export default function App() {
  useEffect(() => {
    const preload = () => {
      void import("@/features/program-details");
      void import("@/features/recommendation-intake");
      void import("@/features/recommendation-summary");
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleWindow = window as IdleWindow;

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(() => preload());
      return () => {
        if (typeof idleWindow.cancelIdleCallback === "function") {
          idleWindow.cancelIdleCallback(idleId);
        }
      };
    }

    const timeoutId = window.setTimeout(preload, 300);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <ProgramDraftProvider>
      <AppShell
        pages={{
          builder: ProgramBuilderPage,
          program: ProgramDetailsPage,
          recommendation: RecommendationIntakePage,
          recommendation_summary: RecommendationSummaryPage,
        }}
      />
    </ProgramDraftProvider>
  );
}
