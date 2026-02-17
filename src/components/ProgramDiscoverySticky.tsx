import { primaryButtonClass } from "@/components/ui/buttonStyles";

type ProgramDiscoveryStickyProps = {
  onStart: () => void;
  onClose: () => void;
};

export function ProgramDiscoverySticky({ onStart, onClose }: ProgramDiscoveryStickyProps) {
  return (
    <aside
      className="fixed bottom-4 right-4 z-40 w-[20rem] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-4 shadow-lg no-print"
      data-pdf-exclude="true"
      aria-label="Program Discovery Prompt"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        aria-label="Close Program Discovery Prompt"
      >
        x
      </button>

      <div className="pr-8">
        <div className="text-sm font-semibold text-foreground">Need a Quick Program Match?</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Would you like a short discovery to identify a strong starter program and add-ons based on company inputs?
        </p>
      </div>

      <button type="button" onClick={onStart} className={`${primaryButtonClass} mt-3 h-10 w-full`}>
        Start Program Discovery
      </button>
    </aside>
  );
}
