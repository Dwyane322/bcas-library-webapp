import { ChevronDown } from "lucide-react";

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  icon?: React.ReactNode;
}

export default function Select({ value, onChange, options, icon }: SelectProps) {
  return (
    <div className="relative inline-flex items-center">
      {icon && <span className="absolute left-3 text-slate-400 pointer-events-none">{icon}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          icon ? "pl-9 pr-8 py-2" : "pl-4 pr-8 py-2"
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );
}
