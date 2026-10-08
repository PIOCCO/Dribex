import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function PageHeader({ title, description, actions }: Props) {
  return (
    <header className="page-header mb-6 border-ink-100 pb-4">
      <div className="min-w-0 flex-1">
        <h1 className="page-title text-navy">{title}</h1>
        {description ? <p className="page-description max-w-2xl">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
