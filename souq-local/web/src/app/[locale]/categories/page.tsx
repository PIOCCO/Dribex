import Link from "next/link";
import { BLUEPRINT_CATEGORIES } from "@/data/blueprints";
import { slugifyCategory } from "@/data/blueprints";
import { blueprintsByCategory } from "@/lib/blueprint-catalog";

export default function CategoriesIndexPage() {
  return (
    <div>
      <header className="mb-10 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-sky-500">Categories</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">Blueprint disciplines</h1>
        <p className="mt-3 text-slate-400">
          Browse infrastructure blueprints by engineering domain—from Azure landing zones to private RAG and agency
          deploy platforms.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {BLUEPRINT_CATEGORIES.map((cat) => {
          const count = blueprintsByCategory(cat).length;
          return (
            <Link
              key={cat}
              href={`/categories/${slugifyCategory(cat)}`}
              className="card-surface flex items-center justify-between p-5 transition hover:border-sky-500/40"
            >
              <span className="font-medium text-slate-200">{cat}</span>
              <span className="font-mono text-sm text-slate-500">{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
