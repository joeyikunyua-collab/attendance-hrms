import { useState, useEffect, useMemo, type FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import { User, Calendar, Clock } from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { useSettings } from "@/lib/SettingsContext";
import type { Employee, LeaveBalance, LeaveRequest, LeaveType } from "@/types";

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
  employees,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Admin-only entry point: when provided, an "Employee" picker is shown
   * and the request is submitted on that employee's behalf instead of the
   * caller's own. Omit for the normal self-service "My Requests" flow. */
  employees?: Employee[];
}) {
  const { settings, refresh: refreshSettings } = useSettings();
  const isOnBehalf = !!employees;
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<LeaveType>("");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  const activeEmployees = useMemo(() => (employees ?? []).filter((e) => e.active), [employees]);
  const defaultType = settings.leaveTypes[0]?.key ?? "";

  // Re-check settings every time the modal opens, not just once at app
  // load - closes the gap where an earlier failed/raced fetch left
  // leaveTypes empty for the rest of the session with no other trigger to
  // retry it.
  useEffect(() => {
    if (isOpen) refreshSettings();
  }, [isOpen, refreshSettings]);

  useEffect(() => {
    if (!isOpen) return;
    if (isOnBehalf && !employeeId) {
      setBalances([]);
      return;
    }
    api
      .get<{ balances: LeaveBalance[] }>("/leave-requests/balance", {
        params: isOnBehalf ? { employeeId } : undefined,
      })
      .then((res) => setBalances(res.data.balances))
      .catch(() => setBalances([]));
  }, [isOpen, isOnBehalf, employeeId]);

  useEffect(() => {
    if (!type && defaultType) setType(defaultType);
  }, [type, defaultType]);

  function reset() {
    setEmployeeId("");
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
    if (settings.leaveTypes.length === 0) {
      setError("No leave types are configured yet");
      return;
    }
    if (isOnBehalf && !employeeId) {
      setError("Select an employee");
      return;
    }
    if (startDate > endDate) {
      setError("Start date must be on or before the end date");
      return;
    }
    setSubmitting(true);
    try {
      await api.post<{ request: LeaveRequest }>("/leave-requests", {
        type,
        startDate,
        endDate,
        reason,
        ...(isOnBehalf ? { employeeId } : {}),
      });
      addToast({
        title: "Request submitted",
        description: isOnBehalf ? "The employee and their manager will be notified." : "Your manager will review it shortly.",
        severity: "success",
      });
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
        <ModalHeader>{isOnBehalf ? "Submit request for employee" : "New request"}</ModalHeader>
        <ModalBody>
          <form id="new-request-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {isOnBehalf && (
              <div className="col-span-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-800 mb-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Employee<span className="text-red-500 ml-0.5">*</span>
                </label>
                <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClass}>
                  <option value="" disabled>
                    Select an employee...
                  </option>
                  {activeEmployees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name} · {e.employeeId}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-800 mb-1">Type</label>
              {settings.leaveTypes.length === 0 ? (
                <>
                  <div className={`${inputClass} bg-slate-50 text-slate-400`}>No leave types available</div>
                  <p className="text-xs text-amber-600 mt-1">
                    Nothing configured yet.{" "}
                    <button type="button" onClick={() => refreshSettings()} className="underline hover:text-amber-700">
                      Try again
                    </button>
                    , or ask an admin to add leave types in Settings.
                  </p>
                </>
              ) : (
                <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                  {settings.leaveTypes.map((lt) => (
                    <option key={lt.key} value={lt.key}>
                      {lt.label}
                    </option>
                  ))}
                </select>
              )}
              {selectedBalance && (
                <p className={`text-xs mt-1 ${exceedsBalance ? "text-red-600" : "text-slate-400"}`}>
                  {selectedBalance.remaining === null
                    ? "Unlimited balance for this type"
                    : `${selectedBalance.remaining} of ${selectedBalance.annualQuota} day(s) remaining this year`}
                </p>
              )}
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-800 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Start date
              </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-800 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                End date
              </label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2 flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-600">Total days</span>
              <span className="ml-auto text-sm font-semibold text-slate-800">
                {startDate && endDate && startDate <= endDate ? requestedDays : "—"}
              </span>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-800 mb-1">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={isOnBehalf ? "Optional - add any context for the record" : "Optional - add any context for your manager"}
                className={inputClass}
              />
            </div>
            {exceedsBalance && (
              <p className="col-span-2 text-sm text-red-600">
                This request ({requestedDays} day{requestedDays === 1 ? "" : "s"}) exceeds the remaining balance.
              </p>
            )}
            {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            type="submit"
            form="new-request-form"
            isLoading={submitting}
            isDisabled={settings.leaveTypes.length === 0}
          >
            Submit request
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
