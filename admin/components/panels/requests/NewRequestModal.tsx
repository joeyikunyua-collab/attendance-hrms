import { useState, useEffect, useMemo, type FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { useSettings } from "@/lib/SettingsContext";
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/types";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

export default function NewRequestModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { settings } = useSettings();
  const [type, setType] = useState<LeaveType>("");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  const defaultType = settings.leaveTypes[0]?.key ?? "";

  useEffect(() => {
    if (!isOpen) return;
    api
      .get<{ balances: LeaveBalance[] }>("/leave-requests/balance")
      .then((res) => setBalances(res.data.balances))
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!type && defaultType) setType(defaultType);
  }, [type, defaultType]);

  function reset() {
    setType(defaultType);
    setStartDate(todayStr());
    setEndDate(todayStr());
    setReason("");
    setError(null);
  }

  const selectedBalance = balances.find((b) => b.key === type) ?? null;
  const requestedDays = useMemo(() => daysBetween(startDate, endDate), [startDate, endDate]);
  const exceedsBalance =
    selectedBalance && selectedBalance.remaining !== null && requestedDays > selectedBalance.remaining;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (startDate > endDate) {
      setError("Start date must be on or before the end date");
      return;
    }
    setSubmitting(true);
    try {
      await api.post<{ request: LeaveRequest }>("/leave-requests", { type, startDate, endDate, reason });
      addToast({ title: "Request submitted", description: "Your manager will review it shortly.", severity: "success" });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, "Failed to submit request");
      setError(message);
      addToast({ title: "Failed to submit request", description: message, severity: "danger" });
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
        <ModalHeader>New request</ModalHeader>
        <ModalBody>
          <form id="new-request-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-800 mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                {settings.leaveTypes.map((lt) => (
                  <option key={lt.key} value={lt.key}>
                    {lt.label}
                  </option>
                ))}
              </select>
              {selectedBalance && (
                <p className={`text-xs mt-1 ${exceedsBalance ? "text-red-600" : "text-slate-400"}`}>
                  {selectedBalance.remaining === null
                    ? "Unlimited balance for this type"
                    : `${selectedBalance.remaining} of ${selectedBalance.annualQuota} day(s) remaining this year`}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-800 mb-1">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Optional - add any context for your manager"
                className={inputClass}
              />
            </div>
            {exceedsBalance && (
              <p className="col-span-2 text-sm text-red-600">
                This request ({requestedDays} day{requestedDays === 1 ? "" : "s"}) exceeds your remaining balance.
              </p>
            )}
            {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" type="submit" form="new-request-form" isLoading={submitting}>
            Submit request
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
