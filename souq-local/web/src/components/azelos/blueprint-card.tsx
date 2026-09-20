import Link from "next/link";
import type { Blueprint } from "@/data/blueprints";
import { formatPrice } from "@/lib/blueprint-catalog";

export function BlueprintCard({ blueprint }: { blueprint: Blueprint }) {
  return (
    <Link
      href={`/blueprints/${blueprint.slug}`}
      className="group card-surface flex flex-col p-5 transition hover:border-sky-500/40 hover:shadow-[0_0_32px_var(--glow)]"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {blueprint.clouds.map((c) => (
          <span
            key={c}
            className="rounded border border-slate-700 bg-slate-900/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-300"
          >
            {c}
          </span>
        ))}
        <span className="ml-auto font-mono text-xs text-slate-500">{blueprint.difficulty}</span>
      </div>
      <h3 className="text-lg font-semibold text-slate-100 group-hover:text-sky-300">{blueprint.name}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">{blueprint.tagline}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {blueprint.technologies.slice(0, 4).map((t) => (
          <span key={t} className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
            {t}
          </span>
        ))}
      </div>
      <div className="mt-auto flex items-end justify-between border-t border-slate-800/80 pt-4 mt-6">
        <div>
          <p className="font-mono text-xs text-slate-500">Est. deploy</p>
          <p className="text-sm text-slate-300">{blueprint.deploymentHours}h</p>
        </div>
        <p className="text-lg font-semibold text-sky-400">{formatPrice(blueprint.priceUsd)}</p>
      </div>
    </Link>
  );
}
