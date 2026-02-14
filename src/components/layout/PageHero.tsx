export function PageHero(props: { title: string; subtitle?: string; id?: string }) {
  const headingId = props.id ?? "page-title";
  return (
    <header className="bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <h1 id={headingId} className="text-3xl font-semibold tracking-tight text-foreground">
          {props.title}
        </h1>
        {props.subtitle ? <p className="mt-2 text-muted-foreground">{props.subtitle}</p> : null}
      </div>
    </header>
  );
}
