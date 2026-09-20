import { notFound } from "next/navigation";
import { BlueprintCard } from "@/components/azelos/blueprint-card";
import { categoryFromSlug } from "@/data/blueprints";
import { blueprintsByCategory } from "@/lib/blueprint-catalog";

type Props = { params: Promise<{ slug: string }> };

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) notFound();
  const items = blueprintsByCategory(category);

  return (
    <div>
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-sky-500">Category</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">{category}</h1>
      </header>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((b) => (
          <BlueprintCard key={b.slug} blueprint={b} />
        ))}
      </div>
    </div>
  );
}
