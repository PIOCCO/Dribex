import { AlertCircle } from "lucide-react";
import { useLocale } from "../../../lib/useLocale";

type Props = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export default function ErrorBanner({ title, message, onRetry }: Props) {
  const { t } = useLocale();
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={18} aria-hidden />
        <div>
          <p className="text-sm font-bold text-red-900">{title || t("adminDash.errorGenericTitle")}</p>
          <p className="text-sm text-red-800">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <button type="button" className="btn-outline btn-sm shrink-0 border-red-200 text-red-800" onClick={onRetry}>
          {t("adminDash.tryAgain")}
        </button>
      ) : null}
    </div>
  );
}
