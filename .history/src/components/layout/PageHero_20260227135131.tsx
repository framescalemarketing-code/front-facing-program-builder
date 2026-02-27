/**
 * PageHero — clean, modern white header with a blue accent stripe.
 * No heavy gradient — just typography and subtle structure.
 */
export function PageHero(props: {
  title: string;
  subtitle?: string;
  id?: string;
  badge?: string;
}) {
  const headingId = props.id ?? "page-title";

  return (
    <header className="relative border-b border-gray-200/60 bg-white">
      {/* Thin blue accent line at the very top */}
      <div
        className="h-1 bg-gradient-to-r from-[#2971b5] via-[#5e97dd] to-[#2971b5]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
        {props.badge && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2971b5]/20 bg-[#2971b5]/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#2971b5]">
            {props.badge}
          </div>
        )}
        <h1
          id={headingId}
          className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl"
        >
          {props.title}
        </h1>
        {props.subtitle && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500 sm:text-[15px]">
            {props.subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
