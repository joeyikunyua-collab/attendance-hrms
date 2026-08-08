import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

export function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
    >
      <path
        d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

export interface LocationEntry {
  label: string;
  time: string | null;
  latitude: number | null;
  longitude: number | null;
}

function osmEmbedUrl(lat: number, lng: number) {
  const delta = 0.01;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat},${lng}`;
}

export default function LocationModal({
  isOpen,
  onClose,
  title,
  entries,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entries: LocationEntry[];
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody className="pb-6">
          {entries.map((entry) => (
            <div key={entry.label} className="mb-4 last:mb-0">
              <p className="text-sm font-medium text-slate-700 mb-1">
                {entry.label}
                {entry.time && <span className="text-slate-400 font-normal"> · {entry.time}</span>}
              </p>
              {entry.latitude !== null && entry.longitude !== null ? (
                <div>
                  <iframe
                    title={`${entry.label} location`}
                    className="w-full h-56 rounded-lg border border-slate-200"
                    src={osmEmbedUrl(entry.latitude, entry.longitude)}
                  />
                  <a
                    href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Open in Google Maps
                  </a>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No location recorded</p>
              )}
            </div>
          ))}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
