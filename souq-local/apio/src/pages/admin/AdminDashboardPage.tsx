import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { useLocale } from "../../lib/useLocale";
import PageHeader from "../../components/admin/ui/PageHeader";
import ErrorBanner from "../../components/admin/ui/ErrorBanner";
import TableSkeleton from "../../components/admin/ui/TableSkeleton";

type Stats = {
  totalUsers: number;
  byRole: { role: string; count: number }[];
  byStatus: { status: string; count: number }[];
  projectStats: { status: string; count: number }[];
  recentUsers: { id: string; email: string; name: string; role: string; status: string; createdAt: string }[];
  recentAudit: { id: string; action: string; targetType?: string; targetId?: string; createdAt: string; adminEmail?: string }[];
};

type OutletCtx = { adminBase?: string };

export default function AdminDashboardPage() {
  const { adminBase = "/" } = useOutletContext<OutletCtx>() || {};
  const root = adminBase.replace(/\/$/, "") || "";
  const { t } = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data, error: err } = await apiFetch<Stats>("/api/admin/stats");
      setLoading(false);
      if (err) setError(err);
      else setStats(data ?? null);
    })();
  }, []);

  if (loading) return <TableSkeleton cols={3} rows={4} />;
  if (error) return <ErrorBanner message={error} />;
  if (!stats) return null;

  const active = stats.byStatus.find((s) => s.status === "ACTIVE")?.count ?? 0;
  const suspended = stats.byStatus.find((s) => s.status === "DISABLED")?.count ?? 0;

  return (
    <>
      <PageHeader title={t("adminDash.dashboardTitle")} description={t("adminDash.dashboardDescription")} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-panel">
          <p className="text-xs font-bold uppercase text-ink-500">{t("adminDash.statTotalUsers")}</p>
          <p className="mt-1 text-3xl font-extrabold text-navy">{stats.totalUsers}</p>
        </div>
        <div className="surface-panel">
          <p className="text-xs font-bold uppercase text-ink-500">{t("adminDash.statActive")}</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-700">{active}</p>
        </div>
        <div className="surface-panel">
          <p className="text-xs font-bold uppercase text-ink-500">{t("adminDash.statSuspended")}</p>
          <p className="mt-1 text-3xl font-extrabold text-amber-700">{suspended}</p>
        </div>
        <div className="surface-panel">
          <p className="text-xs font-bold uppercase text-ink-500">{t("adminDash.statProjects")}</p>
          <p className="mt-1 text-lg font-bold text-navy">
            {stats.projectStats.map((p) => `${p.status}: ${p.count}`).join(" · ") || "—"}
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="surface-panel">
          <h2 className="text-base font-bold text-navy">{t("adminDash.usersByRole")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {stats.byRole.map((r) => (
              <li key={r.role} className="flex justify-between">
                <span>{t(`adminDash.role_${r.role}` as "adminDash.role_CLIENT")}</span>
                <span className="font-bold">{r.count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="surface-panel">
          <h2 className="text-base font-bold text-navy">{t("adminDash.recentUsers")}</h2>
          <ul className="mt-3 divide-y divide-ink-100 text-sm">
            {stats.recentUsers.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-medium">{u.name}</span>
                <Link to={`${root}/users/${u.id}`.replace("//", "/")} className="text-brand-700 hover:underline" dir="ltr">
                  {u.email}
                </Link>
              </li>
            ))}
          </ul>
          <Link to={`${root}/users`.replace("//", "/")} className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
            {t("adminDash.viewAllUsers")}
          </Link>
        </section>
      </div>

      <section className="surface-panel">
        <h2 className="text-base font-bold text-navy">{t("adminDash.recentAudit")}</h2>
        <ul className="mt-3 divide-y divide-ink-100 text-sm">
          {stats.recentAudit.length === 0 ? (
            <li className="py-2 text-ink-500">{t("adminDash.noAudit")}</li>
          ) : (
            stats.recentAudit.map((a) => (
              <li key={a.id} className="py-2">
                <span className="font-mono text-xs text-ink-500">{a.createdAt}</span>
                <span className="mx-2 font-semibold">{a.action}</span>
                <span className="text-ink-600">{a.adminEmail || "—"}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );
}
