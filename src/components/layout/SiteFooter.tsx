export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#00092f]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">

          {/* Brand column */}
          <div>
            <img
              src="/brand/osso/osso-logo-horizontal.png"
              alt="On-Sight Safety Optics"
              className="h-8 w-auto opacity-80"
            />
            <p className="mt-3 text-xs leading-relaxed text-white/40 max-w-xs">
              Prescription safety eyewear programs built around how your workforce actually operates.
            </p>
          </div>

          {/* Image placeholder — footer brand photo */}
          <div
            className="hidden overflow-hidden rounded-xl lg:block"
            aria-hidden="true"
          >
            {/* Replace src with real image when ready */}
            <div
              className="flex h-28 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5"
              data-placeholder-src="/images/footer-workforce.jpg"
            >
              <span className="font-mono text-[10px] text-white/25">/images/footer-workforce.jpg</span>
            </div>
          </div>

          {/* Image placeholder — footer specialist photo */}
          <div
            className="hidden overflow-hidden rounded-xl lg:block"
            aria-hidden="true"
          >
            {/* Replace src with real image when ready */}
            <div
              className="flex h-28 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5"
              data-placeholder-src="/images/footer-specialist.jpg"
            >
              <span className="font-mono text-[10px] text-white/25">/images/footer-specialist.jpg</span>
            </div>
          </div>

        </div>

        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} On-Sight Safety Optics. All rights reserved.
          </p>
          <p className="text-xs text-white/20">OSSO Program Builder</p>
        </div>
      </div>
    </footer>
  );
}
