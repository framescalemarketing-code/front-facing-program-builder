@"
import React, { Suspense, useEffect, useState } from "react";
import type { NavigateFn, PageId } from "./routerTypes";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AppNavProvider } from "@/app/navContext";

type PageProps = { onNavigate: NavigateFn };

export function AppShell(props: { pages: Record<PageId, React.ComponentType<PageProps>> }) {
  const [page, setPage] = useState<PageId>("recommendation");
  const recommendationLaunchPage: PageId = "recommendation";

  const onNavigate: NavigateFn = (nextPage) => {
    setPage(nextPage);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const Current = props.pages[page];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card text-card-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("recommendation")}
              className="flex items-center gap-3 bg-transparent p-0 text-left"
              aria-label="Go to Program Recommendation"
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
        </div>
      </header>

      <main>
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
              <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
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

      <SiteFooter />
    </div>
  );
}
"@ | Set-Content -Encoding utf8 src/app/AppShell.tsx