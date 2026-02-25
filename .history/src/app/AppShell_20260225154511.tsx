import React, { Suspense, useEffect, useState } from "react";
import type { NavigateFn, NavSource, PageId } from "./routerTypes";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ProgramRecommendationSticky } from "@/components/ProgramRecommendationSticky";
import { AppNavProvider } from "@/app/navContext";

type PageProps = { onNavigate: NavigateFn };

export function AppShell(props: { pages: Record<PageId, React.ComponentType<PageProps>> }) {
  const [page, setPage] = useState<PageId>("builder");
  const [isRecommendationStickyClosed, setIsRecommendationStickyClosed] = useState(false);
  const [recommendationLaunchPage, setRecommendationLaunchPage] = useState<PageId>("builder");

  const onNavigate: NavigateFn = (nextPage, via: NavSource = "internal") => {
    const canGoProgram = via === "builder_continue" || via === "internal";
    const canGoSummary =
      via === "program_continue" || via === "recommendation_complete" || via === "internal";

    if (nextPage === "program" && !canGoProgram) {
      setPage("builder");
      return;
    }

    if (nextPage === "recommendation_summary" && !canGoSummary) {
      setPage("program");
      return;
    }

    if (nextPage === "recommendation") {
      setRecommendationLaunchPage(page);
    }

    setPage(nextPage);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const Current = props.pages[page];

  return (
    <div className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header
        className="app-shell-header no-print border-b border-border bg-[color:var(--brand-blue)] text-white shadow-sm"
        data-pdf-exclude="true"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("builder", "internal")}
              className="flex items-center gap-3 bg-transparent p-0 text-left"
              aria-label="Go to Program Guidelines"
            >
              <img
                src="/brand/osso/osso-logo-horizontal.png"
                alt="On-Sight Safety Optics"
                className="hidden h-7 w-auto sm:block sm:h-8"
                loading="eager"
              />
              <img
                src="/brand/osso/osso-logomark.svg"
                alt="OSSO logo mark"
                className="block h-7 w-auto sm:hidden"
                loading="eager"
              />
              <span className="sr-only">On-Sight Safety Optics</span>
            </button>
            <div className="text-xs font-semibold tracking-[0.08em] uppercase sm:text-sm">
              On-Sight Safety Optics
            </div>
          </div>
          <div className="hidden text-xs text-white/90 sm:block">Program Planning Tool</div>
        </div>
      </header>

      <main id="main-content" className="overflow-x-clip bg-background">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                Loading page...
              </div>
            </div>
          }
        >
          <AppNavProvider value={{ currentPage: page, recommendationLaunchPage }}>
            <Current onNavigate={onNavigate} />
          </AppNavProvider>
        </Suspense>
      </main>

      {page !== "recommendation" ? (
        isRecommendationStickyClosed ? (
          <button
            type="button"
            onClick={() => setIsRecommendationStickyClosed(false)}
            className="fixed bottom-4 right-4 z-40 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-lg hover:bg-secondary no-print"
            data-pdf-exclude="true"
            aria-label="Reopen Program Recommendation"
          >
            Reopen Program Recommendation
          </button>
        ) : (
          <ProgramRecommendationSticky
            onStart={() => onNavigate("recommendation", "internal")}
            onClose={() => setIsRecommendationStickyClosed(true)}
          />
        )
      ) : null}

      <SiteFooter />
    </div>
  );
}