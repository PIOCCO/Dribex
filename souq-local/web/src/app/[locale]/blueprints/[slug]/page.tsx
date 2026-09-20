import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchitectureSchematic } from "@/components/azelos/architecture-schematic";
import { getBlueprint } from "@/data/blueprints";
import { formatPrice } from "@/lib/blueprint-catalog";

type Props = { params: Promise<{ slug: string }> };

export default async function BlueprintDetailPage({ params }: Props) {
  const { slug } = await params;
  const bp = getBlueprint(slug);
  if (!bp) notFound();

  return (
    <article className="space-y-12">
      <header className="border-b border-slate-800 pb-10">
        <div className="flex flex-wrap gap-2">
          {bp.clouds.map((c) => (
            <span key={c} className="rounded border border-slate-700 px-2 py-0.5 font-mono text-xs text-slate-400">
              {c}
            </span>
          ))}
          <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs text-slate-500">{bp.category}</span>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-slate-100 sm:text-4xl">{bp.name}</h1>
        <p className="mt-3 max-w-3xl text-lg text-slate-400">{bp.tagline}</p>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <div>
            <p className="font-mono text-xs text-slate-500">Price</p>
            <p className="text-2xl font-semibold text-sky-400">{formatPrice(bp.priceUsd)}</p>
          </div>
          <div>
            <p className="font-mono text-xs text-slate-500">Est. deployment</p>
            <p className="text-lg text-slate-200">{bp.deploymentHours} hours</p>
          </div>
          <div>
            <p className="font-mono text-xs text-slate-500">Version</p>
            <p className="font-mono text-lg text-slate-200">{bp.version}</p>
          </div>
          <Link
            href="/docs"
            className="ml-auto rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-500"
          >
            Get blueprint
          </Link>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <Section title="Problem solved">
            <p className="text-slate-300">{bp.problem}</p>
          </Section>
          <ArchitectureSchematic title="Architecture preview" />
          <Section title="Features">
            <BulletList items={bp.features} />
          </Section>
          <Section title="Architecture components">
            <BulletList items={bp.components} />
          </Section>
          <Section title="Technologies">
            <div className="flex flex-wrap gap-2">
              {bp.technologies.map((t) => (
                <span key={t} className="rounded bg-slate-900 px-3 py-1 font-mono text-sm text-slate-300">
                  {t}
                </span>
              ))}
            </div>
          </Section>
          <Section title="Deployment process">
            <ol className="list-decimal space-y-2 pl-5 text-slate-300">
              {bp.deploymentSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </Section>
          <Section title="Security considerations">
            <BulletList items={bp.securityNotes} />
          </Section>
          <Section title="Changelog">
            <p className="font-mono text-sm text-slate-400">
              v{bp.version} — {bp.changelog}
            </p>
          </Section>
        </div>
        <aside className="space-y-6">
          <div className="card-surface p-5">
            <h2 className="font-mono text-xs uppercase tracking-widest text-slate-500">Who it&apos;s for</h2>
            <BulletList items={bp.audience} />
          </div>
          <div className="card-surface p-5">
            <h2 className="font-mono text-xs uppercase tracking-widest text-slate-500">Requirements</h2>
            <BulletList items={bp.requirements} />
          </div>
          <div className="card-surface p-5">
            <h2 className="font-mono text-xs uppercase tracking-widest text-slate-500">Included</h2>
            <BulletList items={bp.included} />
          </div>
          <div className="card-surface p-5">
            <h2 className="font-mono text-xs uppercase tracking-widest text-slate-500">Use cases</h2>
            <BulletList items={bp.useCases} />
          </div>
          <div className="card-surface p-5">
            <h2 className="font-mono text-xs uppercase tracking-widest text-slate-500">Difficulty</h2>
            <p className="mt-2 text-slate-200">{bp.difficulty}</p>
          </div>
        </aside>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-slate-300">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="text-sky-500">▸</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
