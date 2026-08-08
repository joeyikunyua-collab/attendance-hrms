import { useState } from "react";

const OTHER_SENTINEL = "__other__";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

/** A "selectable dropdown" that still lets an admin type a brand-new value
 * (a new department, a job title nobody's held yet) instead of being
 * locked to whatever already exists in the directory. */
export default function ComboSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const knownOptions = Array.from(new Set([...options, value].filter(Boolean)));
  const [typingNew, setTypingNew] = useState(false);

  if (typingNew) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-800 mb-1">{label}</label>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setTypingNew(false)}
          className="text-xs font-medium text-blue-600 hover:underline mt-1"
        >
          Choose from existing
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-800 mb-1">{label}</label>
      <select
        value={knownOptions.includes(value) ? value : ""}
        onChange={(e) => {
          if (e.target.value === OTHER_SENTINEL) {
            onChange("");
            setTypingNew(true);
          } else {
            onChange(e.target.value);
          }
        }}
        className={inputClass}
      >
        {!value && (
          <option value="" disabled>
            Select {label.toLowerCase()}...
          </option>
        )}
        {knownOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={OTHER_SENTINEL}>+ Add new...</option>
      </select>
    </div>
  );
}
