import React, { Suspense, useCallback, useEffect, useState } from "react";
import type { NavigateFn, PageId } from "./routerTypes";
import { SiteFooter } from "../components/layout/SiteFooter";

type PageProps = { onNavigate: NavigateFn };

const VALID_PAGES: PageId[] = [
  "recommendation",
  "recommendation_summary",
  "recommendation_congratulations",
];

function pageFromHash(): PageId {
  if (typeof window === "undefined") return "recommendation";
  const raw = window.location.hash.replace(/^#\/?/, "");
  return VALID_PAGES.includes(raw as PageId)
    ? (raw as PageId)
    : "recommendation";
}

export function AppShell(props: {
  pages: Record<PageId, React.ComponentType<PageProps>>;
}) {
  const [page, setPage] = useState<PageId>(pageFromHash);

  const onNavigate: NavigateFn = useCallback((nextPage) => {
    setPage(nextPage);
    window.history.pushState({ page: nextPage }, "", `#/${nextPage}`);
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      const target = (e.state as { page?: string })?.page;
      if (target && VALID_PAGES.includes(target as PageId)) {
        setPage(target as PageId);
      } else {
        setPage(pageFromHash());
      }
    }
    window.addEventListener("popstate", handlePopState);
    // Set initial history entry if none exists
    if (!window.history.state?.page) {
      window.history.replaceState({ page }, "", `#/${page}`);
    }
    return () => window.removeEventListener("popstate", handlePopState);
  }, [page]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const Current = props.pages[page];

  const pageLabels: Record<PageId, string> = {
    recommendation: "Program Builder",
    recommendation_summary: "Your Summary",
    recommendation_congratulations: "Confirmation",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Branded nav — uses brand navy rather than the darker ink for a lighter, more accessible feel */}
      <header className="sticky top-0 z-50 bg-[#2460a7] border-b border-white/12 shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("recommendation")}
              className="flex items-center gap-3 bg-transparent p-0 text-left group"
              aria-label="Go to Program Recommendation"
            >
              <img
                src="/brand/osso/osso-logo-horizontal-light.svg"
                alt="On-Sight Safety Optics"
                className="hidden h-9 w-auto sm:block opacity-95 group-hover:opacity-100 transition-opacity"
                loading="eager"
              />
              <img
                src="/brand/osso/osso-logo-icon.svg"
                alt="OSSO logo mark"
                className="block h-9 w-auto sm:hidden opacity-95 group-hover:opacity-100 transition-opacity"
                loading="eager"
              />
              <span className="sr-only">On-Sight Safety Optics</span>
            </button>
            {/* Breadcrumb divider + current page label */}
            <span
              className="hidden items-center gap-2 sm:flex"
              aria-hidden="true"
            >
              <span className="h-3.5 w-px bg-white/20" />
              <span className="text-[11px] font-medium uppercase tracking-widest text-white/60">
                {pageLabels[page]}
              </span>
            </span>
          </div>
          <span className="hidden text-[11px] font-medium text-white/50 sm:block">
            On-Sight Safety Optics
          </span>
        </div>
      </header>

      <main>
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
              <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
                Loading...
              </div>
            </div>
          }
        >
          <Current onNavigate={onNavigate} />
        </Suspense>
      </main>

      <SiteFooter />
    </div>
  );
}
