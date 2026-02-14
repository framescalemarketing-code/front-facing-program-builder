import { lazy, useEffect } from "react";
import { AppShell } from "@/app/AppShell";
import { ProgramDraftProvider } from "@/hooks/useProgramDraft";

const ProgramBuilderPage = lazy(() =>
  import("@/features/program-builder").then((module) => ({ default: module.ProgramBuilderPage }))
);
const ProgramCalculatorPage = lazy(() =>
  import("@/features/program-calculator").then((module) => ({ default: module.ProgramCalculatorPage }))
);
const QuotePreviewPage = lazy(() =>
  import("@/features/quote-preview").then((module) => ({ default: module.QuotePreviewPage }))
);

export default function App() {
  useEffect(() => {
    const preload = () => {
      void import("@/features/program-calculator");
      void import("@/features/quote-preview");
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
          calculator: ProgramCalculatorPage,
          quote: QuotePreviewPage,
        }}
      />
    </ProgramDraftProvider>
  );
}
