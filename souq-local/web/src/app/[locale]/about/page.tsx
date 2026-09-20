import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-sky-500">About Azelos</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">Infrastructure blueprint platform</h1>
      </header>
      <p className="text-lg leading-relaxed text-slate-300">
        Azelos helps companies, agencies, startups, and platform engineers purchase and deploy proven cloud
        architectures—without starting from blank Terraform modules or informal wiki runbooks.
      </p>
      <p className="leading-relaxed text-slate-400">
        Each blueprint packages architecture diagrams, IaC, security notes, deployment time estimates, and operational
        documentation. We focus on B2B-grade delivery: clear scope, explicit requirements, and production-minded defaults.
      </p>
      <div className="card-surface p-6">
        <h2 className="text-lg font-semibold text-slate-100">Who we serve</h2>
        <ul className="mt-4 space-y-2 text-slate-400">
          <li>Platform &amp; DevOps teams standardizing cloud delivery</li>
          <li>Agencies shipping repeatable client infrastructure</li>
          <li>CTOs preparing SOC 2, DR, and FinOps guardrails</li>
          <li>Teams building private AI / RAG on Azure or self-hosted stacks</li>
        </ul>
      </div>
      <Link href="/blueprints" className="inline-block text-sky-400 hover:text-sky-300">
        Browse the marketplace →
      </Link>
    </div>
  );
}
