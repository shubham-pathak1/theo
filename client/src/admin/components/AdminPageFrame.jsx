export function AdminPageFrame({ eyebrow, title, subtitle, action, notice, children }) {
  return (
    <div className="min-h-screen px-4 py-7 pb-24 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8f887f]">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aaa49a]">{subtitle}</p>
          </div>
          {action}
        </header>

        {notice && <p className="rounded-md border border-white/10 bg-[#22211f] px-3 py-2 text-sm text-[#c9c3ba]">{notice}</p>}
        {children}
      </div>
    </div>
  );
}

export function Panel({ title, action, children }) {
  return (
    <section className="border border-white/10 bg-[#1d1c1a]">
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function MetricCard({ icon: Icon, label, value, note }) {
  return (
    <article className="border border-white/10 bg-[#1d1c1a] p-4">
      <div className="mb-5 grid h-10 w-10 place-items-center bg-[#11110f] text-[#e8dfd2] ring-1 ring-white/10">
        <Icon size={19} />
      </div>
      <p className="text-xs uppercase tracking-[0.18em] text-[#8f887f]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-[#8f887f]">{note}</p>
    </article>
  );
}

export function MiniStat({ label, value }) {
  return (
    <div className="border border-white/10 bg-[#151412] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[#8f887f]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
