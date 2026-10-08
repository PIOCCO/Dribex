import { Outlet, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useLocale } from "../../../lib/useLocale";
import AdminSidebar from "./AdminSidebar";

type AdminLayoutProps = { adminBase?: string };

export default function AdminLayout({ adminBase = "/" }: AdminLayoutProps) {
  const base = adminBase.replace(/\/$/, "") || "";
  const { user, logout } = useAuth();
  const { t, lang, changeLang } = useLocale();
  const navigate = useNavigate();
  const [mobileNav, setMobileNav] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate(`${base}/login`.replace("//", "/"));
  };

  return (
    <div className="admin-shell">
      <a href="#admin-main" className="skip-link">
        {t("adminDash.skipToContent")}
      </a>
      {mobileNav && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden"
          aria-label={t("adminDash.closeMenu")}
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        className={`admin-sidebar ${mobileNav ? "fixed inset-y-0 start-0 z-40 flex w-72 max-w-[85vw] shadow-lg" : "hidden lg:flex"}`}
        aria-label={t("adminDash.sidebarLabel")}
      >
        <AdminSidebar adminBase={base} onNavigate={() => setMobileNav(false)} />
      </aside>
      <div className="admin-main" id="admin-main">
        <header className="admin-topbar">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-ghost btn-sm lg:hidden"
              aria-expanded={mobileNav}
              aria-controls="admin-sidebar-nav"
              onClick={() => setMobileNav((v) => !v)}
            >
              {mobileNav ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
              <span className="sr-only">{t("adminDash.menu")}</span>
            </button>
            <span className="text-xs font-bold uppercase tracking-wide text-ink-400 lg:hidden">{t("adminDash.title")}</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="hidden text-end sm:block">
              <p className="text-xs font-semibold text-ink-500">{t("adminDash.signedInAs")}</p>
              <p className="max-w-[200px] truncate text-sm font-bold text-ink-800" dir="ltr">
                {user?.email}
              </p>
            </div>
            <div className="flex rounded-lg border border-ink-200 p-0.5 text-xs font-bold" role="group" aria-label={t("adminDash.languageSection")}>
              <button
                type="button"
                className={`rounded-md px-2 py-1 ${lang === "ar" ? "bg-brand-50 text-brand-800" : "text-ink-500"}`}
                onClick={() => changeLang("ar")}
              >
                {t("adminDash.langAr")}
              </button>
              <button
                type="button"
                className={`rounded-md px-2 py-1 ${lang === "fr" ? "bg-brand-50 text-brand-800" : "text-ink-500"}`}
                onClick={() => changeLang("fr")}
              >
                {t("adminDash.langFr")}
              </button>
            </div>
            <button type="button" className="btn-outline btn-sm" onClick={onLogout}>
              {t("nav.logout")}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet context={{ adminBase: base }} />
        </main>
        <footer className="border-t border-ink-100 px-4 py-2 text-center text-[10px] font-medium text-ink-400 sm:px-6">
          {t("adminDash.uiBuild")}: <span dir="ltr">{__ADMIN_UI_BUILD__}</span>
        </footer>
      </div>
    </div>
  );
}
