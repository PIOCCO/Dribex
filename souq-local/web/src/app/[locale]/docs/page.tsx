import Link from "next/link";

const sections = [
  {
    title: "Getting started",
    links: ["Account & licensing overview", "Blueprint delivery format", "Support & updates"],
  },
  {
    title: "Deployment",
    links: ["Prerequisites checklist", "Environment configuration", "Post-deploy verification"],
  },
  {
    title: "Security",
    links: ["Secrets handling", "Network exposure policy", "Compliance mapping"],
  },
  {
    title: "Operations",
    links: ["Backup & restore", "Monitoring hooks", "Upgrade & changelog process"],
  },
];

export default function DocumentationPage() {
  return (
    <div>
      <header className="mb-10 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-sky-500">Documentation</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">Blueprint documentation hub</h1>
        <p className="mt-3 text-slate-400">
          Professional documentation categories for purchased blueprints. Full PDF and repository access is provided
          after purchase—this hub describes the structure and standards every Azelos blueprint follows.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((sec) => (
          <div key={sec.title} className="card-surface p-6">
            <h2 className="text-lg font-semibold text-slate-100">{sec.title}</h2>
            <ul className="mt-4 space-y-2">
              {sec.links.map((link) => (
                <li key={link} className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="font-mono text-sky-500">→</span>
                  {link}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm text-slate-500">
        Need a specific blueprint doc? Open the blueprint detail page and use{" "}
        <strong className="text-slate-400">Get blueprint</strong> to start checkout (coming soon) or contact sales.
      </p>
      <Link href="/blueprints" className="mt-4 inline-block text-sky-400 hover:text-sky-300">
        Return to marketplace
      </Link>
    </div>
  );
}
