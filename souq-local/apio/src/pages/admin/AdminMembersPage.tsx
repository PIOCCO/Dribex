import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { useLocale } from "../../lib/useLocale";
import { apiFetch } from "../../lib/api";
import PageHeader from "../../components/admin/ui/PageHeader";
import StatusBadge from "../../components/admin/ui/StatusBadge";
import EmptyState from "../../components/admin/ui/EmptyState";
import ErrorBanner from "../../components/admin/ui/ErrorBanner";
import TableSkeleton from "../../components/admin/ui/TableSkeleton";
import CreateMemberDialog from "../../components/admin/CreateMemberDialog";

interface MemberRow {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  status: string;
  owner_profile_id?: string | null;
  created_at: string;
  company?: string | null;
  projectCount?: number;
}

type OutletCtx = { adminBase?: string };

export default function AdminMembersPage() {
  const { adminBase = "/" } = useOutletContext<OutletCtx>() || {};
  const adminRoot = adminBase.replace(/\/$/, "") || "";
  const { t, lang } = useLocale();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Typed in the search box (does not filter until applied). */
  const [searchInput, setSearchInput] = useState("");
  /** Sent to the API — changing this refetches the list. */
  const [appliedQ, setAppliedQ] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchMembers = useCallback(async (opts?: { q?: string; status?: string }) => {
    setLoading(true);
    const params = new URLSearchParams();
    const qq = opts?.q !== undefined ? opts.q : appliedQ;
    const st = opts?.status !== undefined ? opts.status : appliedStatus;
    if (qq) params.set("q", qq);
    if (st) params.set("status", st);
    const { data, error: err } = await apiFetch<{ members: MemberRow[]; total?: number }>(
      `/api/admin/members${params.toString() ? `?${params}` : ""}`,
    );
    setLoading(false);
    if (err) {
      setError(err);
      setMembers([]);
      setTotalMembers(0);
    } else {
      setError(null);
      setMembers(data?.members ?? []);
      setTotalMembers(typeof data?.total === "number" ? data.total : (data?.members?.length ?? 0));
    }
  }, [appliedQ, appliedStatus]);

  const reload = () => {
    void fetchMembers();
  };

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const hasFilters = Boolean(appliedQ || appliedStatus);
  const locale = lang === "fr" ? "fr-FR" : "ar-MA";
  const isFiltered = hasFilters && members.length !== totalMembers;

  const applySearch = () => {
    setAppliedQ(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setAppliedQ("");
    setAppliedStatus("");
    void fetchMembers({ q: "", status: "" });
  };

  const toggleStatus = async (member: MemberRow) => {
    const next = member.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await apiFetch(`/api/admin/members/${member.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    reload();
  };

  return (
    <>
      <PageHeader
        title={t("adminDash.membersPageTitle")}
        description={t("adminDash.membersPageDescription")}
        actions={
          <>
            <button type="button" className="btn-outline btn-sm" onClick={reload} aria-label={t("adminDash.refresh")}>
              <RefreshCw size={16} aria-hidden />
            </button>
            <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden />
              <span>{t("adminDash.createMember")}</span>
            </button>
          </>
        }
      />

      {success ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900" role="status">
          {success}
        </p>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={reload} /> : null}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} aria-hidden />
            <input
              className="input w-full ps-9 pe-9"
              placeholder={t("adminDash.searchMembers")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applySearch();
                }
              }}
              aria-label={t("adminDash.searchMembers")}
            />
            {searchInput ? (
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:bg-ink-50"
                onClick={() => {
                  setSearchInput("");
                  if (appliedQ) {
                    setAppliedQ("");
                  }
                }}
                aria-label={t("adminDash.clearSearch")}
              >
                <X size={14} aria-hidden />
              </button>
            ) : null}
          </div>
          <button type="button" className="btn-outline sm:w-auto" onClick={applySearch}>
            {t("adminDash.applySearch")}
          </button>
          <select
            className="input sm:w-48"
            value={appliedStatus}
            onChange={(e) => setAppliedStatus(e.target.value)}
            aria-label={t("adminDash.statusFilterLabel")}
          >
            <option value="">{t("adminDash.allStatuses")}</option>
            <option value="ACTIVE">{t("adminDash.statusActive")}</option>
            <option value="DISABLED">{t("adminDash.statusSuspended")}</option>
          </select>
        </div>
        <p className="text-sm font-semibold text-ink-500">
          {isFiltered
            ? t("adminDash.memberCountFiltered", { shown: members.length, total: totalMembers })
            : t("adminDash.memberCount", { count: totalMembers || members.length })}
        </p>
      </div>

      {hasFilters ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span>{t("adminDash.filtersActiveHint")}</span>
          <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={clearFilters}>
            {t("adminDash.clearFilters")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <TableSkeleton cols={7} />
      ) : members.length === 0 ? (
        <EmptyState
          title={hasFilters ? t("adminDash.noMembersFilteredTitle") : t("adminDash.noMembersYetTitle")}
          description={hasFilters ? t("adminDash.noMembersFiltered") : t("adminDash.noMembersYet")}
          action={
            hasFilters ? (
              <button type="button" className="btn-outline" onClick={clearFilters}>
                {t("adminDash.clearFilters")}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
                <Plus size={16} aria-hidden />
                <span>{t("adminDash.createMember")}</span>
              </button>
            )
          }
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{t("adminDash.company")}</th>
                <th scope="col">{t("adminDash.contact")}</th>
                <th scope="col">{t("auth.email")}</th>
                <th scope="col">{t("adminDash.status")}</th>
                <th scope="col">{t("adminDash.projectCount")}</th>
                <th scope="col">{t("adminDash.created")}</th>
                <th scope="col" className="text-end">
                  {t("adminDash.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="max-w-[180px] truncate font-medium" title={m.company || undefined}>
                    {m.company || "—"}
                  </td>
                  <td className="max-w-[140px] truncate">{m.name}</td>
                  <td className="max-w-[200px] truncate font-mono text-xs" dir="ltr" title={m.email}>
                    {m.email}
                  </td>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                  <td>{m.projectCount ?? 0}</td>
                  <td className="whitespace-nowrap text-ink-600">
                    {new Date(m.created_at).toLocaleDateString(locale)}
                  </td>
                  <td className="text-end whitespace-nowrap">
                    <Link to={`${adminRoot}/members/${m.id}`.replace("//", "/")} className="font-semibold text-brand-700 hover:underline">
                      {t("adminDash.view")}
                    </Link>
                    <span className="mx-2 text-ink-200" aria-hidden>
                      |
                    </span>
                    <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => toggleStatus(m)}>
                      {m.status === "ACTIVE" ? t("adminDash.suspend") : t("adminDash.activate")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateMemberDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(meta) => {
          setSearchInput("");
          setAppliedQ("");
          setAppliedStatus("");
          void fetchMembers({ q: "", status: "" });
          setSuccess(
            meta?.alreadyExists ? t("adminDash.memberAlreadyCreated") : t("adminDash.memberCreatedSuccess"),
          );
          window.setTimeout(() => setSuccess(null), 5000);
        }}
      />
    </>
  );
}
