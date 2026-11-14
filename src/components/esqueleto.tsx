export function EsqueletoPagina() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-6 h-8 w-56 rounded-lg bg-zinc-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-200/70" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-xl bg-zinc-200/70" />
    </div>
  );
}
