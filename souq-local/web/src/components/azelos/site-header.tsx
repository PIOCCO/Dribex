import Link from "next/link";

const nav = [
  { href: "/blueprints", label: "Marketplace" },
  { href: "/categories", label: "Categories" },
  { href: "/docs", label: "Documentation" },
  { href: "/about", label: "About" },
];

export function AzelosSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 font-mono text-sm font-bold text-sky-400">
            Az
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-100">
            Azelos
            <span className="ml-1 hidden font-normal text-slate-500 sm:inline">Blueprint Platform</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-slate-400 transition hover:text-sky-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/blueprints"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
        >
          Browse blueprints
        </Link>
      </div>
    </header>
  );
}
