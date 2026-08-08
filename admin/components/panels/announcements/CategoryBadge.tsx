import type { AnnouncementCategory } from "@/types";

const CONFIG: Record<AnnouncementCategory, { label: string; className: string }> = {
  company_update: { label: "COMPANY UPDATE", className: "bg-blue-50 text-blue-700" },
  policy: { label: "POLICY", className: "bg-violet-50 text-violet-700" },
  event: { label: "EVENT", className: "bg-emerald-50 text-emerald-700" },
};

export default function CategoryBadge({ category }: { category: AnnouncementCategory }) {
  const { label, className } = CONFIG[category] ?? CONFIG.company_update;
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
