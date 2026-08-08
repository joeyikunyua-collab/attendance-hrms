import type { LucideIcon } from "lucide-react";

export interface ViewOption<T extends string> {
  value: T;
  label: string;
  description: string;
  icon: LucideIcon;
}

export default function ViewSwitcher<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ViewOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Attendance view" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {options.map((option) => {
        const isActive = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={`relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
              isActive
                ? "bg-blue-50/40 border-blue-600 ring-1 ring-blue-600/20"
                : "border-slate-200/80 bg-white hover:border-slate-300"
            }`}
          >
            <div
              className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${isActive ? "text-blue-700" : "text-slate-900"}`}>
                {option.label}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 truncate">{option.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
