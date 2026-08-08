export function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path
        d="M5 8a5 5 0 0 1 10 0c0 3.5 1.5 4.5 1.5 5.5H3.5C3.5 12.5 5 11.5 5 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 16.5a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
