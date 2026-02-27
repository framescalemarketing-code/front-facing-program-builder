import { lazy } from "react";
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
const RecommendationCongratulationsPage = lazy(() =>
  import("./features/recommendation-congratulations").then((module) => ({
    default: module.RecommendationCongratulationsPage,
  }))
);

export default function App() {
  return (
    <ProgramDraftProvider>
      <AppShell
        pages={{
          recommendation: RecommendationIntakePage,
          recommendation_summary: RecommendationSummaryPage,
          recommendation_congratulations: RecommendationCongratulationsPage,
        }}
      />
    </ProgramDraftProvider>
  );
}
