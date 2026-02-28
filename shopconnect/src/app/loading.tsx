export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 md:py-12">
        <section className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
          <div className="mb-8 space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-12 w-full max-w-3xl animate-pulse rounded bg-muted" />
            <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-muted" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-24 animate-pulse rounded-xl border bg-muted/60" />
            <div className="h-24 animate-pulse rounded-xl border bg-muted/60" />
            <div className="h-24 animate-pulse rounded-xl border bg-muted/60" />
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-6">
          <div className="grid gap-3 md:grid-cols-[2fr,1fr,auto]">
            <div className="h-11 animate-pulse rounded-md bg-muted" />
            <div className="h-11 animate-pulse rounded-md bg-muted" />
            <div className="h-11 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="h-8 w-52 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-80 animate-pulse rounded-xl border bg-muted/60" />
            <div className="h-80 animate-pulse rounded-xl border bg-muted/60" />
            <div className="h-80 animate-pulse rounded-xl border bg-muted/60" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="h-8 w-44 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-xl border bg-muted/60" />
            <div className="h-72 animate-pulse rounded-xl border bg-muted/60" />
            <div className="h-72 animate-pulse rounded-xl border bg-muted/60" />
          </div>
        </section>
      </div>
    </main>
  );
}
