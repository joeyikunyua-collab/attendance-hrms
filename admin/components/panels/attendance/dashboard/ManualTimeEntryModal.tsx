import { useEffect, useState, type FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import type { Employee } from "@/types";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ManualTimeEntryModal({
  isOpen,
  onClose,
  employees,
  onSaved,
  initialEmployeeId,
  initialDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onSaved: () => void;
  initialEmployeeId?: string;
  initialDate?: string;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(todayStr());
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [status, setStatus] = useState<"present" | "late" | "absent">("present");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setEmployeeId("");
    setDate(todayStr());
    setCheckIn("");
    setCheckOut("");
    setStatus("present");
    setError(null);
  }

  // Pre-fill from the audit drawer's "Add manual entry" shortcut, applied
  // fresh each time the modal opens rather than on every prop change.
  useEffect(() => {
    if (!isOpen) return;
    if (initialEmployeeId) setEmployeeId(initialEmployeeId);
    if (initialDate) setDate(initialDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError("Choose an employee");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/attendance/manual", {
        employeeId,
        date,
        checkIn: checkIn ? `${date}T${checkIn}:00` : null,
        checkOut: checkOut ? `${date}T${checkOut}:00` : null,
        status,
      });
      addToast({
        title: "Entry saved",
        description: "The attendance record was created/updated.",
        severity: "success",
      });
      reset();
      onSaved();
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, "Failed to save the entry");
      setError(message);
      addToast({ title: "Failed to save entry", description: message, severity: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      placement="center"
      size="lg"
    >
      <ModalContent>
        <ModalHeader>Manual time entry</ModalHeader>
        <ModalBody>
          <p className="text-sm text-slate-500 -mt-2 mb-2">
            Creates the day&apos;s record for an employee if none exists, or overwrites it if one does.
          </p>
          <form id="manual-entry-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="manual-entry-employee">
                Employee
              </label>
              <select
                id="manual-entry-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="" disabled>
                  Select an employee...
                </option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} · {emp.employeeId}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="manual-entry-date">
                Date
              </label>
              <input
                id="manual-entry-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="manual-entry-checkin">
                Check-in
              </label>
              <input
                id="manual-entry-checkin"
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="manual-entry-checkout">
                Check-out
              </label>
              <input
                id="manual-entry-checkout"
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="manual-entry-status">
                Status
              </label>
              <select
                id="manual-entry-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "present" | "late" | "absent")}
                className={inputClass}
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" type="submit" form="manual-entry-form" isLoading={submitting}>
            Save entry
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
