import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useLocale } from "../../lib/useLocale";
import type { Property } from "../../data/types";
import PageHeader from "../../components/admin/ui/PageHeader";
import StatusBadge from "../../components/admin/ui/StatusBadge";
import ErrorBanner from "../../components/admin/ui/ErrorBanner";
import TableSkeleton from "../../components/admin/ui/TableSkeleton";

type AdminMemberDetailPageProps = { adminBase?: string };

type OutletCtx = { adminBase?: string };

export default function AdminMemberDetailPage({ adminBase: adminBaseProp }: AdminMemberDetailPageProps) {
  const ctx = useOutletContext<OutletCtx>();
  const adminRoot = (adminBaseProp || ctx?.adminBase || "/").replace(/\/$/, "") || "";
  const { id } = useParams();
  const { t, L } = useLocale();
  const [detail, setDetail] = useState<{
    user: { id: string; email: string; name: string; status: string; owner_profile_id: string; created_at: string };
    profile: { agency?: { fr: string; ar: string }; name?: { fr: string; ar: string } };
    memberProjects: (Property & { status: string; hidden?: boolean })[];
    activity: { id: string; action: string; createdAt: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error: err } = await apiFetch(`/api/admin/members/${id}`);
    setLoading(false);
    if (err) setError(err);
    else setDetail(data as typeof detail);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const suspend = async () => {
    if (!detail) return;
    const next = detail.user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await apiFetch(`/api/admin/members/${detail.user.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    load();
  };

  if (loading) return <TableSkeleton cols={4} rows={3} />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!detail) return null;

  const title = L(detail.profile?.agency) || L(detail.profile?.name) || detail.user.name;

  return (
    <>
      <Link
        to={`${adminRoot}/members`.replace("//", "/") || "/members"}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft size={16} aria-hidden />
        <span>{t("adminDash.backToMembers")}</span>
      </Link>

      <PageHeader
        title={title}
        description={detail.user.email}
        actions={
          <button type="button" className={detail.user.status === "ACTIVE" ? "btn-danger btn-sm" : "btn-primary btn-sm"} onClick={suspend}>
            {detail.user.status === "ACTIVE" ? t("adminDash.suspend") : t("adminDash.activate")}
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={detail.user.status} />
      </div>

      <section className="surface-panel">
        <h2 className="text-base font-bold text-navy">{t("adminDash.memberProjects")}</h2>
        <ul className="mt-4 divide-y divide-ink-100">
          {detail.memberProjects.length === 0 ? (
            <li className="py-4 text-sm text-ink-500">{t("adminDash.noMemberProjects")}</li>
          ) : (
            detail.memberProjects.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="font-medium">{L(p.title)}</span>
                <span className="text-xs font-bold uppercase text-ink-500">
                  {p.status}
                  {p.hidden ? ` · ${t("adminDash.hidden")}` : ""}
                </span>
                {p.slug ? (
                  <Link to={`/property/${p.slug}`} className="text-sm font-semibold text-brand-700 hover:underline" target="_blank" rel="noopener noreferrer">
                    {t("common.viewMore")}
                  </Link>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      {detail.activity.length > 0 ? (
        <section className="surface-panel mt-6">
          <h2 className="text-base font-bold text-navy">{t("ownerPortal.recentActivity")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-ink-600">
            {detail.activity.map((a) => (
              <li key={a.id}>
                {a.action} · {new Date(a.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
