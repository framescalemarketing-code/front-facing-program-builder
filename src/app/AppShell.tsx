import React, { Suspense, useEffect, useState } from "react";
import type { NavigateFn, NavSource, PageId } from "./routerTypes";
import { SiteFooter } from "@/components/layout/SiteFooter";

type PageProps = { onNavigate: NavigateFn };

export function AppShell(props: { pages: Record<PageId, React.ComponentType<PageProps>> }) {
  const [page, setPage] = useState<PageId>("builder");

  const onNavigate: NavigateFn = (nextPage, via: NavSource = "internal") => {
    const canGoCalculator = via === "builder_continue" || via === "internal";
    const canGoQuote = via === "calculator_continue" || via === "internal";

    if (nextPage === "calculator" && !canGoCalculator) {
      setPage("builder");
      return;
    }

    if (nextPage === "quote" && !canGoQuote) {
      setPage("calculator");
      return;
    }

    setPage(nextPage);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const Current = props.pages[page];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header
        className="border-b border-border bg-card text-card-foreground app-shell-header no-print"
        data-pdf-exclude="true"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("builder", "internal")}
              className="flex items-center gap-3 bg-transparent p-0 text-left"
              aria-label="Go to Program Builder"
            >
              <img
                src="/brand/osso/osso-logo-horizontal.png"
                alt="On-Sight Safety Optics"
                className="hidden h-10 w-auto sm:block"
                loading="eager"
              />
              <img
                src="/brand/osso/osso-logomark.svg"
                alt="OSSO logo mark"
                className="block h-10 w-auto sm:hidden"
                loading="eager"
              />
              <span className="sr-only">On-Sight Safety Optics</span>
            </button>
            <div className="text-sm font-semibold">On-Sight Safety Optics</div>
          </div>
          <div className="hidden text-xs text-muted-foreground sm:block">Internal Quote Tool</div>
        </div>
      </header>

      <main id="main-content" className="bg-background">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
              <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Loading page...</div>
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
