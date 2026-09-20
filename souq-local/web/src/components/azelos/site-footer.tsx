import Link from "next/link";

export function AzelosSiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/80">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="font-semibold text-slate-200">Azelos</p>
          <p className="mt-2 text-sm text-slate-500">
            Production-ready cloud infrastructure, packaged as deployable blueprints for teams that ship seriously.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/blueprints" className="text-slate-400 hover:text-sky-300">
            Marketplace
          </Link>
          <Link href="/categories" className="text-slate-400 hover:text-sky-300">
            Categories
          </Link>
          <Link href="/docs" className="text-slate-400 hover:text-sky-300">
            Documentation
          </Link>
        </div>
        <div className="text-sm text-slate-500">
          <p>B2B blueprint sales · Azure · Docker · Kubernetes · SOC · FinOps · AI infra</p>
          <p className="mt-2 font-mono text-xs">© {new Date().getFullYear()} Azelos</p>
        </div>
      </div>
    </footer>
  );
}
