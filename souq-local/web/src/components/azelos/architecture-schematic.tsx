type Props = { title?: string; className?: string };

/** Decorative architecture diagram for blueprint pages. */
export function ArchitectureSchematic({ title = "Reference topology", className = "" }: Props) {
  return (
    <div className={`card-surface p-6 ${className}`}>
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-slate-400">{title}</p>
      <svg viewBox="0 0 640 280" className="h-auto w-full text-slate-500" aria-hidden>
        <defs>
          <linearGradient id="az-g" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect x="240" y="16" width="160" height="44" rx="6" fill="#0f172a" stroke="url(#az-g)" strokeWidth="2" />
        <text x="320" y="44" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontFamily="monospace">
          Edge / Ingress
        </text>
        <line x1="320" y1="60" x2="320" y2="88" stroke="#475569" strokeWidth="2" />
        <rect x="200" y="88" width="120" height="48" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
        <text x="260" y="118" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
          Compute
        </text>
        <rect x="320" y="88" width="120" height="48" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
        <text x="380" y="118" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
          Workers
        </text>
        <line x1="260" y1="136" x2="260" y2="168" stroke="#475569" strokeWidth="2" />
        <line x1="380" y1="136" x2="380" y2="168" stroke="#475569" strokeWidth="2" />
        <rect x="120" y="168" width="140" height="48" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
        <text x="190" y="198" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
          Data store
        </text>
        <rect x="280" y="168" width="140" height="48" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
        <text x="350" y="198" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
          Object storage
        </text>
        <rect x="440" y="168" width="140" height="48" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
        <text x="510" y="198" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">
          Observability
        </text>
        <rect x="48" y="232" width="544" height="36" rx="6" fill="#020617" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
        <text x="320" y="254" textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="monospace">
          Private network · IAM · Secrets · Policy guardrails
        </text>
      </svg>
    </div>
  );
}
