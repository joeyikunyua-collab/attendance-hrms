import { useState, type FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import { Info } from "lucide-react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export default function ScheduleDeliveryModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [format, setFormat] = useState<"csv" | "pdf">("pdf");
  const [recipients, setRecipients] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setFrequency("weekly");
    setFormat("pdf");
    setRecipients("");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const emails = recipients
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      setError("Add at least one recipient email");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/report-schedules", { frequency, format, recipients: emails });
      addToast({
        title: "Delivery schedule saved",
        description: "The preference was saved. Sending still requires SMTP delivery to be configured.",
        severity: "success",
      });
      reset();
      onSaved();
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, "Failed to save the schedule");
      setError(message);
      addToast({ title: "Failed to save schedule", description: message, severity: "danger" });
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
        <ModalHeader>Schedule automatic delivery</ModalHeader>
        <ModalBody>
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200/60 px-3 py-2 mb-2 text-xs text-amber-800">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              This saves a delivery preference. Actual email dispatch isn&apos;t wired up yet (no SMTP provider is
              configured) - an administrator needs to enable that separately before reports are sent automatically.
            </p>
          </div>
          <form id="schedule-delivery-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="schedule-frequency">
                Frequency
              </label>
              <select
                id="schedule-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as "daily" | "weekly" | "monthly")}
                className={inputClass}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="schedule-format">
                Format
              </label>
              <select
                id="schedule-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as "csv" | "pdf")}
                className={inputClass}
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-800 mb-1" htmlFor="schedule-recipients">
                Recipient emails
              </label>
              <input
                id="schedule-recipients"
                type="text"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="payroll@company.com, hr@company.com"
                className={inputClass}
              />
              <p className="text-xs text-slate-400 mt-1">Comma-separated</p>
            </div>
            {error && <p className="col-span-2 text-sm text-red-600">{error}</p>}
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" type="submit" form="schedule-delivery-form" isLoading={submitting}>
            Save schedule
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
