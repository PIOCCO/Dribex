import Link from "next/link";
import { BlueprintCard } from "@/components/azelos/blueprint-card";
import { ArchitectureSchematic } from "@/components/azelos/architecture-schematic";
import { BLUEPRINT_CATEGORIES } from "@/data/blueprints";
import { slugifyCategory } from "@/data/blueprints";
import { featuredBlueprints, popularBlueprints } from "@/lib/blueprint-catalog";

export default function AzelosHomePage() {
  const featured = featuredBlueprints();
  const popular = popularBlueprints();

  return (
    <div className="space-y-20 animate-fade-in">
      <section className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-sky-500">Azelos Blueprint Platform</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Production-ready cloud infrastructure,{" "}
            <span className="text-gradient">packaged as deployable blueprints.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
            Discover Azure architectures, Docker stacks, CI/CD, monitoring, SOC, FinOps, and private AI
            infrastructure—built for platform teams, agencies, and engineering-led companies.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/blueprints"
              className="rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Explore marketplace
            </Link>
            <Link
              href="/docs"
              className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 hover:border-sky-500/50"
            >
              Documentation
            </Link>
          </div>
        </div>
        <ArchitectureSchematic title="Blueprint delivery model" />
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-100">Featured blueprints</h2>
          <Link href="/blueprints" className="text-sm text-sky-400 hover:text-sky-300">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((b) => (
            <BlueprintCard key={b.slug} blueprint={b} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-100">Browse by discipline</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BLUEPRINT_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/categories/${slugifyCategory(cat)}`}
              className="card-surface px-4 py-3 text-sm text-slate-300 transition hover:border-sky-500/40 hover:text-sky-200"
            >
              {cat}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-slate-100">Popular with platform teams</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {popular.map((b) => (
            <BlueprintCard key={b.slug} blueprint={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
