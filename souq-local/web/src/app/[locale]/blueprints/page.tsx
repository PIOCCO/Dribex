import { Suspense } from "react";
import { BlueprintCard } from "@/components/azelos/blueprint-card";
import { BlueprintFilters } from "@/components/azelos/blueprint-filters";
import { filterBlueprints, type BlueprintFilters as Filters } from "@/lib/blueprint-catalog";
import type { CloudProvider, Difficulty } from "@/data/blueprints";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function param(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function BlueprintMarketplacePage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters: Filters = {
    q: param(sp.q),
    cloud: param(sp.cloud) as CloudProvider | "",
    category: param(sp.category),
    tech: param(sp.tech),
    difficulty: param(sp.difficulty) as Difficulty | "",
    maxPrice: param(sp.maxPrice) ? Number(param(sp.maxPrice)) : undefined,
    maxHours: param(sp.maxHours) ? Number(param(sp.maxHours)) : undefined,
    useCase: param(sp.useCase),
  };
  const results = filterBlueprints(filters);

  return (
    <div>
      <header className="mb-10 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-widest text-sky-500">Marketplace</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100 sm:text-4xl">Infrastructure blueprints</h1>
        <p className="mt-3 text-slate-400">
          Filter by cloud, category, stack, difficulty, price, and deployment time. Every blueprint includes
          architecture guidance, security notes, and deployment runbooks.
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <Suspense fallback={<div className="card-surface h-96 animate-pulse" />}>
          <BlueprintFilters />
        </Suspense>
        <div>
          <p className="mb-4 font-mono text-sm text-slate-500">{results.length} blueprint(s)</p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((b) => (
              <BlueprintCard key={b.slug} blueprint={b} />
            ))}
          </div>
          {results.length === 0 && (
            <p className="card-surface p-8 text-center text-slate-400">No blueprints match these filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}
