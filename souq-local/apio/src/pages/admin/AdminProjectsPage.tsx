import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useLocale } from "../../lib/useLocale";
import PageHeader from "../../components/admin/ui/PageHeader";
import ErrorBanner from "../../components/admin/ui/ErrorBanner";
import EmptyState from "../../components/admin/ui/EmptyState";
import TableSkeleton from "../../components/admin/ui/TableSkeleton";

interface AdminProject {
  id: string;
  slug: string;
  title: { fr: string; ar: string };
  status: string;
  hidden?: boolean;
  ownerLabel?: string;
}

export default function AdminProjectsPage() {
  const { t, L } = useLocale();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = q ? `?q=${encodeURIComponent(q)}` : "";
    const { data, error: err } = await apiFetch<{ projects: AdminProject[] }>(`/api/admin/member-projects${params}`);
    setLoading(false);
    if (err) {
      setError(err);
      setProjects([]);
    } else {
      setError(null);
      setProjects(data?.projects ?? []);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const hide = async (id: string, hidden: boolean) => {
    await apiFetch(`/api/admin/member-projects/${id}`, { method: "PATCH", body: JSON.stringify({ hidden }) });
    load();
  };

  return (
    <>
      <PageHeader
        title={t("adminDash.tabProjects")}
        description={t("adminDash.projectsPageDescription")}
        actions={
          <button type="button" className="btn-outline btn-sm" onClick={load} aria-label={t("adminDash.refresh")}>
            <RefreshCw size={16} aria-hidden />
          </button>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} aria-hidden />
        <input
          className="input w-full ps-9"
          placeholder={t("ownerPortal.searchProjects")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t("ownerPortal.searchProjects")}
        />
      </div>

      {loading ? (
        <TableSkeleton cols={4} rows={4} />
      ) : projects.length === 0 ? (
        <EmptyState title={t("adminDash.noProjectsTitle")} description={t("adminDash.noProjects")} />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t("adminDash.titleFr")}</th>
                <th scope="col">{t("adminDash.member")}</th>
                <th scope="col">{t("adminDash.status")}</th>
                <th scope="col" className="text-end">
                  {t("adminDash.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-xs truncate font-medium">{L(p.title)}</td>
                  <td>{p.ownerLabel}</td>
                  <td className="text-ink-600">
                    {p.status}
                    {p.hidden ? ` · ${t("adminDash.hidden")}` : ""}
                  </td>
                  <td className="space-x-2 text-end whitespace-nowrap">
                    {p.slug ? (
                      <Link to={`/property/${p.slug}`} className="font-semibold text-brand-700 hover:underline" target="_blank" rel="noopener noreferrer">
                        {t("common.viewMore")}
                      </Link>
                    ) : null}
                    <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => hide(p.id, !p.hidden)}>
                      {p.hidden ? t("adminDash.unhide") : t("adminDash.hide")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
