import { useLocale } from "../../../lib/useLocale";

type MemberStatus = "ACTIVE" | "DISABLED" | string;

export default function StatusBadge({ status }: { status: MemberStatus }) {
  const { t } = useLocale();
  const active = status === "ACTIVE";
  return (
    <span className={active ? "admin-badge-active" : "admin-badge-suspended"}>
      {active ? t("adminDash.statusActive") : t("adminDash.statusSuspended")}
    </span>
  );
}
