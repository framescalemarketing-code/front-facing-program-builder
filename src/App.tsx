import { AppShell } from "@/app/AppShell";
import { ProgramDraftProvider } from "@/hooks/useProgramDraft";
import { ProgramBuilderPage } from "@/features/program-builder";
import { ProgramCalculatorPage } from "@/features/program-calculator";
import { QuotePreviewPage } from "@/features/quote-preview";

export default function App() {
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
