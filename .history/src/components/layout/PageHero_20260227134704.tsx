/**
 * PageHero — used by the intake wizard and summary pages.
 * Gradient uses OSSO brand navy and blue for a clean, readable surface.
 */
export function PageHero(props: {
  title: string;
  subtitle?: string;
  id?: string;
  badge?: string;
}) {
  const headingId = props.id ?? "page-title";

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-[#2971b5] via-[#4a8fd4] to-[#6baee8] text-white">
      {/* Subtle dot-grid texture */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.09] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="hero-dots"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {props.badge && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/90">
            {props.badge}
          </div>
        )}
        <h1
          id={headingId}
          className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
        >
          {props.title}
        </h1>
        {props.subtitle && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/85 sm:text-[15px]">
            {props.subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
