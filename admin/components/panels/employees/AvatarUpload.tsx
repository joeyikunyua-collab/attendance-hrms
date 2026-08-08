import { useRef, useState } from "react";
import { addToast } from "@heroui/react";
import { Camera, X } from "lucide-react";
import { resizeImageToDataUrl } from "@/lib/imageResize";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Prominent upload widget for the Add/Edit employee forms - distinct from
 * the compact multi-color `Avatar` used in tables, per the reference design
 * (soft blue placeholder tint rather than the deterministic per-person
 * palette, since this is a single upload prompt, not a directory of people
 * to visually distinguish from each other). */
export default function AvatarUpload({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      addToast({ title: "Not an image", description: "Choose a JPG, PNG, or similar image file.", severity: "danger" });
      return;
    }
    setProcessing(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      addToast({
        title: "Couldn't process image",
        description: err instanceof Error ? err.message : "Please try a different file.",
        severity: "danger",
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={name || "Profile photo"} className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-semibold">
            {name ? initials(name) : <Camera className="w-6 h-6" />}
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          aria-label="Upload photo"
          className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white border-2 border-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">Profile photo</p>
        <p className="text-xs text-slate-400 mb-1.5">JPG or PNG, auto-cropped to a square.</p>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600">
            <X className="w-3 h-3" />
            Remove photo
          </button>
        )}
        {processing && <p className="text-xs text-slate-400">Processing…</p>}
      </div>
    </div>
  );
}
