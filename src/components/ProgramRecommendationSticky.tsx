import { primaryButtonClass } from "@/components/ui/buttonStyles";

type ProgramRecommendationStickyProps = {
  onStart: () => void;
  onClose: () => void;
};

export function ProgramRecommendationSticky({ onStart, onClose }: ProgramRecommendationStickyProps) {
  return (
    <aside
      className="fixed bottom-4 right-4 z-40 w-[20rem] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-4 shadow-lg no-print"
      data-pdf-exclude="true"
      aria-label="Program Recommendation Prompt"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        aria-label="Close Program Recommendation Prompt"
      >
        x
      </button>

      <div className="pr-8">
        <div className="text-sm font-semibold text-foreground">Need a Guided Setup?</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Use a short guided intake to build a recommended starter program configuration.
        </p>
      </div>

      <button type="button" onClick={onStart} className={`${primaryButtonClass} mt-3 h-10 w-full`}>
        Start Program Recommendation
      </button>
    </aside>
  );
}
