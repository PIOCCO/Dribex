import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useLocale } from "../../lib/useLocale";
import PageHeader from "../../components/admin/ui/PageHeader";
import StatusBadge from "../../components/admin/ui/StatusBadge";
import ErrorBanner from "../../components/admin/ui/ErrorBanner";
import TableSkeleton from "../../components/admin/ui/TableSkeleton";

type OutletCtx = { adminBase?: string };

type Detail = {
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: string;
    status: string;
    ownerProfileId?: string | null;
    createdAt?: string;
    updatedAt?: string;
    stats?: {
      conversationsAsClient?: number;
      messagesSent?: number;
      totalProjects?: number;
      publishedProjects?: number;
    };
  };
};

const ROLES = ["CLIENT", "REAL_ESTATE_OWNER", "SUPER_ADMIN"] as const;

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminBase = "/" } = useOutletContext<OutletCtx>() || {};
  const root = adminBase.replace(/\/$/, "") || "";
  const { t } = useLocale();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [newRole, setNewRole] = useState("");
  const [roleReason, setRoleReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteMode, setDeleteMode] = useState<"hard" | "anonymize">("anonymize");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error: err } = await apiFetch<Detail>(`/api/admin/users/${id}`);
    setLoading(false);
    if (err) setError(err);
    else if (data?.user) {
      setDetail(data);
      setForm({ name: data.user.name, phone: data.user.phone || "", email: data.user.email });
      setNewRole(data.user.role);
      setError(null);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveProfile = async () => {
    if (!detail) return;
    setSaving(true);
    setMessage(null);
    const { error: err } = await apiFetch(`/api/admin/users/${detail.user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: form.name, phone: form.phone || null, email: form.email }),
    });
    setSaving(false);
    if (err) setError(err);
    else {
      setMessage(t("adminDash.saved"));
      void load();
    }
  };

  const toggleStatus = async () => {
    if (!detail) return;
    const next = detail.user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    if (next === "DISABLED" && !suspendReason.trim()) {
      setError(t("adminDash.suspendReasonRequired"));
      return;
    }
    setSaving(true);
    const { error: err } = await apiFetch(`/api/admin/users/${detail.user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next, suspendReason: suspendReason.trim() || undefined }),
    });
    setSaving(false);
    if (err) setError(err);
    else void load();
  };

  const applyRole = async () => {
    if (!detail || newRole === detail.user.role) return;
    if (!window.confirm(t("adminDash.confirmRoleChange"))) return;
    setSaving(true);
    setError(null);
    const { error: err, code } = await apiFetch(`/api/admin/users/${detail.user.id}/role`, {
      method: "POST",
      body: JSON.stringify({ role: newRole, reason: roleReason.trim() || undefined }),
    });
    setSaving(false);
    if (err) {
      setError(
        code === "OWNER_PROFILE_REQUIRED" ? t("adminDash.errOwnerProfileRequired") : err,
      );
    } else {
      setMessage(t("adminDash.roleUpdated"));
      void load();
    }
  };

  const deleteUser = async () => {
    if (!detail) return;
    setSaving(true);
    setError(null);
    const { error: err } = await apiFetch(`/api/admin/users/${detail.user.id}/delete`, {
      method: "POST",
      body: JSON.stringify({ confirmEmail: deleteEmail.trim(), mode: deleteMode }),
    });
    setSaving(false);
    if (err) setError(err);
    else navigate(`${root}/users`.replace("//", "/"));
  };

  if (loading) return <TableSkeleton cols={4} rows={4} />;
  if (error && !detail) return <ErrorBanner message={error} onRetry={load} />;
  if (!detail) return null;

  const u = detail.user;
  const memberLink =
    u.role === "REAL_ESTATE_OWNER" && u.ownerProfileId
      ? `${root}/members/${u.id}`.replace("//", "/")
      : null;

  return (
    <>
      <Link to={`${root}/users`.replace("//", "/")} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft size={16} aria-hidden />
        {t("adminDash.backToUsers")}
      </Link>

      <PageHeader title={u.name} description={u.email} actions={<StatusBadge status={u.status} />} />

      {message ? <p className="mb-4 text-sm font-medium text-emerald-800">{message}</p> : null}
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="surface-panel">
          <p className="text-xs font-bold uppercase text-ink-500">{t("adminDash.roleLabel")}</p>
          <p className="mt-1 font-semibold">{t(`adminDash.role_${u.role}` as "adminDash.role_CLIENT")}</p>
        </div>
        <div className="surface-panel">
          <p className="text-xs font-bold uppercase text-ink-500">{t("adminDash.statMessages")}</p>
          <p className="mt-1 font-semibold">{u.stats?.messagesSent ?? 0}</p>
        </div>
        <div className="surface-panel">
          <p className="text-xs font-bold uppercase text-ink-500">{t("adminDash.statConversations")}</p>
          <p className="mt-1 font-semibold">{u.stats?.conversationsAsClient ?? 0}</p>
        </div>
        <div className="surface-panel">
          <p className="text-xs font-bold uppercase text-ink-500">{t("adminDash.projectCount")}</p>
          <p className="mt-1 font-semibold">{u.stats?.totalProjects ?? 0}</p>
        </div>
      </div>

      {memberLink ? (
        <p className="mb-4 text-sm">
          <Link to={memberLink} className="font-semibold text-brand-700 hover:underline">
            {t("adminDash.openMemberProfile")}
          </Link>
        </p>
      ) : null}

      <section className="surface-panel mb-6">
        <h2 className="text-base font-bold text-navy">{t("adminDash.editUser")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label">{t("adminDash.contactName")}</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="field-label">{t("auth.phone")}</label>
            <input className="input" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">{t("auth.email")}</label>
            <input className="input" dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <button type="button" className="btn-primary mt-4" disabled={saving} onClick={() => void saveProfile()}>
          {t("adminDash.saveChanges")}
        </button>
      </section>

      <section className="surface-panel mb-6">
        <h2 className="text-base font-bold text-navy">{t("adminDash.changeRole")}</h2>
        {u.role === "CLIENT" ? (
          <p className="mt-2 text-sm text-ink-600">{t("adminDash.promoteOwnerHint")}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3">
          <select className="input sm:w-56" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r} disabled={r === "SUPER_ADMIN" && u.role !== "SUPER_ADMIN"}>
                {t(`adminDash.role_${r}` as "adminDash.role_CLIENT")}
              </option>
            ))}
          </select>
          <input className="input min-w-[200px] flex-1" placeholder={t("adminDash.roleReasonPlaceholder")} value={roleReason} onChange={(e) => setRoleReason(e.target.value)} />
          <button type="button" className="btn-outline" disabled={saving || newRole === u.role} onClick={() => void applyRole()}>
            {t("adminDash.applyRole")}
          </button>
        </div>
      </section>

      <section className="surface-panel mb-6">
        <h2 className="text-base font-bold text-navy">{t("adminDash.accountStatus")}</h2>
        {u.status === "ACTIVE" ? (
          <input className="input mt-3" placeholder={t("adminDash.suspendReasonPlaceholder")} value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} />
        ) : null}
        <button type="button" className={`mt-3 ${u.status === "ACTIVE" ? "btn-danger" : "btn-primary"}`} disabled={saving} onClick={() => void toggleStatus()}>
          {u.status === "ACTIVE" ? t("adminDash.suspend") : t("adminDash.activate")}
        </button>
      </section>

      <section className="surface-panel border-red-200">
        <h2 className="text-base font-bold text-red-800">{t("adminDash.dangerZone")}</h2>
        <p className="mt-2 text-sm text-ink-600">{t("adminDash.deleteUserHint")}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <select className="input sm:w-48" value={deleteMode} onChange={(e) => setDeleteMode(e.target.value as "hard" | "anonymize")}>
            <option value="anonymize">{t("adminDash.deleteModeAnonymize")}</option>
            <option value="hard">{t("adminDash.deleteModeHard")}</option>
          </select>
          <input className="input min-w-[220px] flex-1" dir="ltr" placeholder={t("adminDash.confirmEmailPlaceholder")} value={deleteEmail} onChange={(e) => setDeleteEmail(e.target.value)} />
          <button type="button" className="btn-danger" disabled={saving || deleteEmail.trim().toLowerCase() !== u.email.toLowerCase()} onClick={() => void deleteUser()}>
            {t("adminDash.deleteUser")}
          </button>
        </div>
      </section>
    </>
  );
}
