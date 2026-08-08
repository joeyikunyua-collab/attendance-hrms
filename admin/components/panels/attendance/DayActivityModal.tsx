import { useState } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import LocationModal, { EyeIcon } from "@/components/LocationModal";
import type { AttendanceRecord } from "@/types";

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function DayActivityModal({
  isOpen,
  onClose,
  date,
  record,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  record: AttendanceRecord | null;
}) {
  const [showLocation, setShowLocation] = useState<"checkin" | "checkout" | null>(null);

  const checkInTime = formatTime(record?.checkIn ?? null);
  const checkOutTime = formatTime(record?.checkOut ?? null);
  const hasCheckInLocation = record?.checkInLatitude != null && record?.checkInLongitude != null;
  const hasCheckOutLocation = record?.checkOutLatitude != null && record?.checkOutLongitude != null;

  const totalHours =
    record?.checkIn && record?.checkOut
      ? formatDuration(new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime())
      : null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} placement="center" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{date}</ModalHeader>
          <ModalBody className="pb-6">
            {!record || !record.checkIn ? (
              <p className="text-sm text-slate-500">No attendance recorded for this day.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                  <div>
                    <p className="text-xs text-slate-500">Check-in</p>
                    <p className="text-sm font-medium text-slate-800">{checkInTime}</p>
                  </div>
                  {hasCheckInLocation && (
                    <button
                      onClick={() => setShowLocation("checkin")}
                      title="View check-in location"
                      aria-label="View check-in location"
                      className="text-slate-400 hover:text-blue-600"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                  <div>
                    <p className="text-xs text-slate-500">Check-out</p>
                    <p className="text-sm font-medium text-slate-800">{checkOutTime ?? "Not checked out"}</p>
                  </div>
                  {hasCheckOutLocation && (
                    <button
                      onClick={() => setShowLocation("checkout")}
                      title="View check-out location"
                      aria-label="View check-out location"
                      className="text-slate-400 hover:text-blue-600"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Total hours</p>
                  <p className="text-sm font-medium text-slate-800">{totalHours ?? "—"}</p>
                </div>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {showLocation && record && (
        <LocationModal
          isOpen
          onClose={() => setShowLocation(null)}
          title={date}
          entries={[
            showLocation === "checkin"
              ? {
                  label: "Check-in",
                  time: checkInTime,
                  latitude: record.checkInLatitude,
                  longitude: record.checkInLongitude,
                }
              : {
                  label: "Check-out",
                  time: checkOutTime,
                  latitude: record.checkOutLatitude,
                  longitude: record.checkOutLongitude,
                },
          ]}
        />
      )}
    </>
  );
}
