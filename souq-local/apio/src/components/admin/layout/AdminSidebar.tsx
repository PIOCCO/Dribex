import { NavLink } from "react-router-dom";
import { FileText, FolderKanban, LayoutDashboard, Users } from "lucide-react";
import { useLocale } from "../../../lib/useLocale";
import BrandLogo from "../../BrandLogo";

type Props = { adminBase: string; onNavigate?: () => void };

export default function AdminSidebar({ adminBase, onNavigate }: Props) {
  const { t } = useLocale();
  const base = adminBase || "/";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `admin-nav-item w-full ${isActive ? "admin-nav-item-active" : ""}`;

  const items = [
    { to: base || "/", end: true, icon: LayoutDashboard, label: t("adminDash.tabDashboard") },
    { to: `${base}/users`.replace("//", "/"), icon: Users, label: t("adminDash.tabUsers") },
    { to: `${base}/members`.replace("//", "/"), icon: Users, label: t("adminDash.tabMembers") },
    { to: `${base}/projects`.replace("//", "/"), icon: FolderKanban, label: t("adminDash.tabProjects") },
    { to: `${base}/content`.replace("//", "/"), icon: FileText, label: t("adminDash.tabContent") },
  ];

  return (
    <div className="flex h-full flex-col px-3 py-4" id="admin-sidebar-nav">
      <div className="mb-6 px-1">
        <BrandLogo variant="onLight" linkToHome={false} />
        <p className="mt-2 text-xs font-semibold text-ink-500">{t("adminDash.consoleSubtitle")}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label={t("adminDash.sidebarLabel")}>
        {items.map(({ to, end, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={end} className={linkClass} onClick={onNavigate}>
            <Icon size={18} strokeWidth={2} aria-hidden className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto hidden rounded-lg border border-ink-100 bg-surface px-3 py-3 text-xs text-ink-500 lg:block">
        <LayoutDashboard size={14} className="mb-1 inline text-brand-600" aria-hidden />
        <p>{t("adminDash.sidebarHint")}</p>
      </div>
    </div>
  );
}
