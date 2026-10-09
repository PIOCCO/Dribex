import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useLocale } from "../../lib/useLocale";
import PageHeader from "../../components/admin/ui/PageHeader";
import StatusBadge from "../../components/admin/ui/StatusBadge";
import ErrorBanner from "../../components/admin/ui/ErrorBanner";
import TableSkeleton from "../../components/admin/ui/TableSkeleton";
import EmptyState from "../../components/admin/ui/EmptyState";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt?: string;
  stats?: { totalProjects?: number; conversationsAsClient?: number };
};

type OutletCtx = { adminBase?: string };

const ROLES = ["", "CLIENT", "REAL_ESTATE_OWNER", "SUPER_ADMIN"] as const;

function roleLabel(t: (k: string) => string, role: string) {
  if (role === "CLIENT") return t("adminDash.role_CLIENT");
  if (role === "REAL_ESTATE_OWNER") return t("adminDash.role_REAL_ESTATE_OWNER");
  if (role === "SUPER_ADMIN") return t("adminDash.role_SUPER_ADMIN");
  return role;
}

export default function AdminUsersPage() {
  const { adminBase = "/" } = useOutletContext<OutletCtx>() || {};
  const root = adminBase.replace(/\/$/, "") || "";
  const { t, lang } = useLocale();
  const [params, setParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(params.get("q") || "");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Math.max(1, Number(params.get("page")) || 1);
  const role = params.get("role") || "";
  const status = params.get("status") || "";
  const sort = params.get("sort") || "created_desc";
  const q = params.get("q") || "";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (role) qs.set("role", role);
    if (status) qs.set("status", status);
    if (sort) qs.set("sort", sort);
    qs.set("page", String(page));
    qs.set("limit", "25");
    const { data, error: err } = await apiFetch<{
      users: UserRow[];
      total: number;
      pages: number;
    }>(`/api/admin/users?${qs}`);
    setLoading(false);
    if (err) {
      setError(err);
      setUsers([]);
    } else {
      setError(null);
      setUsers(data?.users ?? []);
      setTotal(data?.total ?? 0);
      setPages(data?.pages ?? 1);
    }
  }, [q, role, status, sort, page]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const applySearch = () => {
    const next = new URLSearchParams(params);
    if (searchInput.trim()) next.set("q", searchInput.trim());
    else next.delete("q");
    next.set("page", "1");
    setParams(next);
  };

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setParams(next);
  };

  const locale = lang === "fr" ? "fr-FR" : "ar-MA";

  return (
    <>
      <PageHeader
        title={t("adminDash.usersPageTitle")}
        description={t("adminDash.usersPageDescription")}
        actions={
          <button type="button" className="btn-outline btn-sm" onClick={() => void fetchUsers()} aria-label={t("adminDash.refresh")}>
            <RefreshCw size={16} aria-hidden />
          </button>
        }
      />
      {error ? <ErrorBanner message={error} onRetry={() => void fetchUsers()} /> : null}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} aria-hidden />
          <input
            className="input w-full ps-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applySearch())}
            placeholder={t("adminDash.searchUsers")}
            aria-label={t("adminDash.searchUsers")}
          />
        </div>
        <button type="button" className="btn-outline" onClick={applySearch}>
          {t("adminDash.applySearch")}
        </button>
        <select className="input sm:w-44" value={role} onChange={(e) => setFilter("role", e.target.value)} aria-label={t("adminDash.filterRole")}>
          <option value="">{t("adminDash.allRoles")}</option>
          {ROLES.filter(Boolean).map((r) => (
            <option key={r} value={r}>
              {roleLabel(t, r)}
            </option>
          ))}
        </select>
        <select className="input sm:w-40" value={status} onChange={(e) => setFilter("status", e.target.value)} aria-label={t("adminDash.statusFilterLabel")}>
          <option value="">{t("adminDash.allStatuses")}</option>
          <option value="ACTIVE">{t("adminDash.statusActive")}</option>
          <option value="DISABLED">{t("adminDash.statusSuspended")}</option>
        </select>
        <select className="input sm:w-44" value={sort} onChange={(e) => setFilter("sort", e.target.value)} aria-label={t("adminDash.sortLabel")}>
          <option value="created_desc">{t("adminDash.sortNewest")}</option>
          <option value="created_asc">{t("adminDash.sortOldest")}</option>
          <option value="name_asc">{t("adminDash.sortName")}</option>
          <option value="email_asc">{t("adminDash.sortEmail")}</option>
        </select>
      </div>

      <p className="mb-3 text-sm font-semibold text-ink-500">{t("adminDash.userCount", { count: total })}</p>

      {loading ? (
        <TableSkeleton cols={6} />
      ) : users.length === 0 ? (
        <EmptyState title={t("adminDash.noUsersTitle")} description={t("adminDash.noUsers")} />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("adminDash.contact")}</th>
                <th>{t("auth.email")}</th>
                <th>{t("adminDash.roleLabel")}</th>
                <th>{t("adminDash.status")}</th>
                <th>{t("adminDash.created")}</th>
                <th className="text-end">{t("adminDash.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td className="max-w-[200px] truncate font-mono text-xs" dir="ltr">
                    {u.email}
                  </td>
                  <td>{roleLabel(t, u.role)}</td>
                  <td>
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="whitespace-nowrap text-ink-600">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString(locale) : "—"}
                  </td>
                  <td className="text-end">
                    <Link to={`${root}/users/${u.id}`.replace("//", "/")} className="font-semibold text-brand-700 hover:underline">
                      {t("adminDash.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="btn-outline btn-sm"
            disabled={page <= 1}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("page", String(page - 1));
              setParams(next);
            }}
          >
            {t("adminDash.prevPage")}
          </button>
          <span className="text-sm text-ink-600">
            {t("adminDash.pageOf", { page, pages })}
          </span>
          <button type="button" className="btn-outline btn-sm" disabled={page >= pages} onClick={() => {
            const next = new URLSearchParams(params);
            next.set("page", String(page + 1));
            setParams(next);
          }}>
            {t("adminDash.nextPage")}
          </button>
        </div>
      ) : null}
    </>
  );
}
