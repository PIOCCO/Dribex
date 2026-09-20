import {
  type Blueprint,
  type BlueprintCategory,
  type CloudProvider,
  type Difficulty,
  blueprints,
  categoryFromSlug,
} from "@/data/blueprints";

export type BlueprintFilters = {
  q?: string;
  cloud?: CloudProvider | "";
  category?: string;
  tech?: string;
  difficulty?: Difficulty | "";
  maxPrice?: number;
  maxHours?: number;
  useCase?: string;
};

function matchesQuery(b: Blueprint, q: string): boolean {
  const hay = [
    b.name,
    b.tagline,
    b.problem,
    ...b.technologies,
    ...b.useCases,
    b.category,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function filterBlueprints(filters: BlueprintFilters): Blueprint[] {
  let list = [...blueprints];
  if (filters.q?.trim()) {
    list = list.filter((b) => matchesQuery(b, filters.q!.trim()));
  }
  if (filters.cloud) {
    list = list.filter((b) => b.clouds.includes(filters.cloud as CloudProvider));
  }
  if (filters.category) {
    const cat = categoryFromSlug(filters.category);
    if (cat) list = list.filter((b) => b.category === cat);
  }
  if (filters.tech?.trim()) {
    const t = filters.tech.toLowerCase();
    list = list.filter((b) => b.technologies.some((x) => x.toLowerCase().includes(t)));
  }
  if (filters.difficulty) {
    list = list.filter((b) => b.difficulty === filters.difficulty);
  }
  if (filters.maxPrice != null && filters.maxPrice > 0) {
    list = list.filter((b) => b.priceUsd <= filters.maxPrice!);
  }
  if (filters.maxHours != null && filters.maxHours > 0) {
    list = list.filter((b) => b.deploymentHours <= filters.maxHours!);
  }
  if (filters.useCase?.trim()) {
    const u = filters.useCase.toLowerCase();
    list = list.filter((b) => b.useCases.some((x) => x.toLowerCase().includes(u)));
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function featuredBlueprints(): Blueprint[] {
  return blueprints.filter((b) => b.featured);
}

export function popularBlueprints(): Blueprint[] {
  return blueprints.filter((b) => b.popular);
}

export function blueprintsByCategory(category: BlueprintCategory): Blueprint[] {
  return blueprints.filter((b) => b.category === category);
}

export function formatPrice(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usd);
}
