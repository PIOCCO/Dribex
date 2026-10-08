import AdminContentPanels from "../../components/admin/AdminContentPanels";
import PageHeader from "../../components/admin/ui/PageHeader";
import { useLocale } from "../../lib/useLocale";

export default function AdminContentPage() {
  const { t } = useLocale();
  return (
    <>
      <PageHeader title={t("adminDash.tabContent")} description={t("adminDash.contentPageDescription")} />
      <AdminContentPanels />
    </>
  );
}
