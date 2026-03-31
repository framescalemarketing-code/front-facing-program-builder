type PartnerLogo = {
  name: string;
  src: string;
  href: string;
};

const PARTNER_LOGOS: PartnerLogo[] = [
  {
    name: "Abbott",
    src: "/brand/partners/abbott-logo.svg",
    href: "https://www.abbott.com",
  },
  {
    name: "Dexcom",
    src: "/brand/partners/dexcom-logo.svg",
    href: "https://www.dexcom.com",
  },
  {
    name: "Johnson & Johnson",
    src: "/brand/partners/jnj-logo.svg",
    href: "https://www.jnj.com",
  },
  {
    name: "SDGE",
    src: "/brand/partners/sdge-logo.svg",
    href: "https://www.sdge.com",
  },
  {
    name: "Thermo Fisher",
    src: "/brand/partners/thermofisher-logo.svg",
    href: "https://www.thermofisher.com",
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Partners
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            {PARTNER_LOGOS.map((p) => (
              <a
                key={p.name}
                href={p.href}
                className="inline-flex items-center"
                target="_blank"
                rel="noreferrer"
                aria-label={p.name}
              >
                <img
                  src={p.src}
                  alt={p.name}
                  className="h-6 w-auto opacity-90 transition hover:opacity-100"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
