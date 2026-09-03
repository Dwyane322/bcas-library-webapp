import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      )}
    </div>
  );
}
