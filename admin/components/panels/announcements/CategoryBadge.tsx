import { useSettings } from "@/lib/SettingsContext";

const PALETTE = [
  "bg-blue-50 text-blue-700",
  "bg-violet-50 text-violet-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
  "bg-cyan-50 text-cyan-700",
  "bg-fuchsia-50 text-fuchsia-700",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function titleCase(key: string): string {
  return key
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

/** Category color is derived deterministically from its key rather than a
 * fixed lookup table, since admins can add categories at any time - same
 * key always gets the same color without needing a color picker in Settings. */
export default function CategoryBadge({ category }: { category: string }) {
  const { settings } = useSettings();
  const config = settings.announcementCategories.find((c) => c.key === category);
  const label = config?.label ?? titleCase(category);
  const className = PALETTE[hashString(category) % PALETTE.length];

  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
