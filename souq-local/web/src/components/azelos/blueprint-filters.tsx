"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BLUEPRINT_CATEGORIES } from "@/data/blueprints";
import { slugifyCategory } from "@/data/blueprints";

const clouds = ["", "Azure", "AWS", "GCP", "Self-hosted"] as const;
const difficulties = ["", "Starter", "Intermediate", "Advanced", "Enterprise"] as const;

export function BlueprintFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/blueprints?${next.toString()}`);
  }

  return (
    <div className="card-surface space-y-4 p-4 lg:sticky lg:top-24">
      <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Filters</p>
      <label className="block text-sm">
        <span className="text-slate-400">Search</span>
        <input
          type="search"
          defaultValue={params.get("q") ?? ""}
          placeholder="Kubernetes, SOC, Terraform…"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          onKeyDown={(e) => {
            if (e.key === "Enter") update("q", (e.target as HTMLInputElement).value);
          }}
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Cloud</span>
        <select
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          value={params.get("cloud") ?? ""}
          onChange={(e) => update("cloud", e.target.value)}
        >
          {clouds.map((c) => (
            <option key={c || "any"} value={c}>
              {c || "Any cloud"}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Category</span>
        <select
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          value={params.get("category") ?? ""}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">All categories</option>
          {BLUEPRINT_CATEGORIES.map((c) => (
            <option key={c} value={slugifyCategory(c)}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Technology</span>
        <input
          type="text"
          defaultValue={params.get("tech") ?? ""}
          placeholder="Terraform, Docker…"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          onBlur={(e) => update("tech", e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Difficulty</span>
        <select
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          value={params.get("difficulty") ?? ""}
          onChange={(e) => update("difficulty", e.target.value)}
        >
          {difficulties.map((d) => (
            <option key={d || "any"} value={d}>
              {d || "Any level"}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Max price (USD)</span>
        <input
          type="number"
          min={0}
          step={100}
          defaultValue={params.get("maxPrice") ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          onBlur={(e) => update("maxPrice", e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-400">Max deploy time (hours)</span>
        <input
          type="number"
          min={0}
          defaultValue={params.get("maxHours") ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          onBlur={(e) => update("maxHours", e.target.value)}
        />
      </label>
    </div>
  );
}
