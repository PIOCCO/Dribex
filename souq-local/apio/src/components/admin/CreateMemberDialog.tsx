import { useEffect, useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { useLocale } from "../../lib/useLocale";
import { apiFetch } from "../../lib/api";

type CreatedMeta = { alreadyExists?: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (meta?: CreatedMeta) => void;
};

function emailTakenMessage(t: (key: string) => string, role: string) {
  if (role === "CLIENT") return t("adminDash.emailTakenRole_CLIENT");
  if (role === "SUPER_ADMIN") return t("adminDash.emailTakenRole_SUPER_ADMIN");
  if (role === "REAL_ESTATE_OWNER") return t("adminDash.emailTakenRole_REAL_ESTATE_OWNER");
  return t("adminDash.emailAlreadyInUse");
}

const initialForm = {
  email: "",
  password: "",
  name: "",
  phone: "",
  companyFr: "",
  companyAr: "",
  cityId: "oujda",
  contactPosition: "",
};

export default function CreateMemberDialog({ open, onClose, onCreated }: Props) {
  const { t } = useLocale();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setError(null);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || submitting) return;
    submitLock.current = true;
    setError(null);
    setSubmitting(true);
    const emailNorm = form.email.trim().toLowerCase();
    try {
      const { error: err, status, code, existingRole, existingMemberId } = await apiFetch(
        "/api/admin/members",
        {
        method: "POST",
        body: JSON.stringify({
          email: emailNorm,
          password: form.password,
          name: form.name,
          phone: form.phone || undefined,
          companyFr: form.companyFr,
          companyAr: form.companyAr,
          cityId: form.cityId,
          contactPosition: form.contactPosition || undefined,
          status: "ACTIVE",
        }),
      },
      );
      if (err) {
        if (status === 409 || code === "EMAIL_TAKEN" || /already in use/i.test(err)) {
          if (existingRole === "REAL_ESTATE_OWNER" && existingMemberId) {
            onCreated({ alreadyExists: true });
            onClose();
            return;
          }
          if (existingRole && existingRole !== "REAL_ESTATE_OWNER") {
            setError(emailTakenMessage(t, existingRole));
            return;
          }
          const listed = await apiFetch<{ members: { email: string }[] }>(
            `/api/admin/members?q=${encodeURIComponent(emailNorm)}`,
          );
          const exists = listed.data?.members?.some(
            (m) => m.email.trim().toLowerCase() === emailNorm,
          );
          if (exists) {
            onCreated({ alreadyExists: true });
            onClose();
            return;
          }
          const lookup = await apiFetch<{ found?: boolean; user?: { role: string } }>(
            `/api/admin/users/lookup?email=${encodeURIComponent(emailNorm)}`,
          );
          if (lookup.data?.found && lookup.data.user?.role) {
            const role = lookup.data.user.role;
            if (role === "REAL_ESTATE_OWNER") {
              onCreated({ alreadyExists: true });
              onClose();
              return;
            }
            setError(emailTakenMessage(t, role));
            return;
          }
          setError(t("adminDash.emailAlreadyInUse"));
        } else {
          setError(err);
        }
        return;
      }
      onCreated();
      onClose();
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="w-[min(100%,32rem)] max-w-lg rounded-2xl border border-ink-100 bg-white p-0 shadow-card backdrop:bg-ink-900/50"
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex max-h-[min(90vh,640px)] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-navy">
              {t("adminDash.createMember")}
            </h2>
            <p className="mt-1 text-sm text-ink-500">{t("adminDash.createMemberHint")}</p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label={t("common.cancel")}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <fieldset className="space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wide text-ink-500">{t("adminDash.memberInfoSection")}</legend>
            <div>
              <label className="field-label" htmlFor="cm-name">
                {t("adminDash.contactName")} *
              </label>
              <input id="cm-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="cm-position">
                {t("adminDash.contactPosition")}
              </label>
              <input id="cm-position" className="input" value={form.contactPosition} onChange={(e) => setForm({ ...form, contactPosition: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="cm-co-fr">
                  {t("adminDash.companyFr")} *
                </label>
                <input id="cm-co-fr" className="input" required value={form.companyFr} onChange={(e) => setForm({ ...form, companyFr: e.target.value })} />
              </div>
              <div>
                <label className="field-label" htmlFor="cm-co-ar">
                  {t("adminDash.companyAr")}
                </label>
                <input id="cm-co-ar" dir="rtl" className="input" value={form.companyAr} onChange={(e) => setForm({ ...form, companyAr: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="cm-email">
                {t("auth.email")} *
              </label>
              <input id="cm-email" dir="ltr" className="input" required type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="cm-phone">
                {t("auth.phone")}
              </label>
              <input id="cm-phone" dir="ltr" className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="field-label" htmlFor="cm-password">
                {t("auth.password")} *
              </label>
              <input id="cm-password" dir="ltr" className="input" required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <p className="mt-1 text-xs text-ink-500">{t("adminDash.passwordHint")}</p>
            </div>
          </fieldset>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 px-5 py-4">
          <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            <Plus size={16} aria-hidden />
            <span>{submitting ? t("common.loading") : t("adminDash.createMember")}</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}
