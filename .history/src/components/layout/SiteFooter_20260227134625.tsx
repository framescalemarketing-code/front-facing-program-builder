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
    <footer className="mt-16 border-t border-white/15 bg-[#244093]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          <div>
            <img
              src="/brand/osso/osso-logo-horizontal-light.svg"
              alt="On-Sight Safety Optics"
              className="h-8 w-auto opacity-95"
            />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/75">
              We help teams build the right prescription safety eyewear program
              — and make sure it actually sticks.
            </p>
          </div>

          <div
            className="hidden overflow-hidden rounded-xl lg:block"
            aria-hidden="true"
          >
            <img
              src="/images/footer-workforce.jpg"
              alt=""
              className="h-28 w-full object-cover opacity-95"
              loading="lazy"
            />
          </div>

          <div
            className="hidden overflow-hidden rounded-xl lg:block"
            aria-hidden="true"
          >
            <img
              src="/images/footer-specialist.jpg"
              alt=""
              className="h-28 w-full object-cover opacity-95"
              loading="lazy"
            />
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-white/15 bg-white/10 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/65">
            Partners
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
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
                  className="h-6 w-auto opacity-90 brightness-0 invert transition hover:opacity-100"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-1 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/55">
            (c) {new Date().getFullYear()} On-Sight Safety Optics. All rights
            reserved.
          </p>
          <p className="text-xs text-white/45">OSSO Program Builder</p>
        </div>
      </div>
    </footer>
  );
}
