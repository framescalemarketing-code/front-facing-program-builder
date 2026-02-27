/**
 * PageHero — used by the intake wizard.
 * Dark navy gradient matches the AppShell nav and the summary/congrats page heroes,
 * so the whole app feels like one continuous branded surface.
 */
export function PageHero(props: {
  title: string;
  subtitle?: string;
  id?: string;
}) {
  const headingId = props.id ?? "page-title";

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-[#00092f] via-[#162d6e] to-[#244093] text-white">
      {/* Subtle dot-grid texture — same family as summary card */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.07] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="hero-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <h1
          id={headingId}
          className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
        >
          {props.title}
        </h1>
        {props.subtitle && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/65 sm:text-[15px]">
            {props.subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
