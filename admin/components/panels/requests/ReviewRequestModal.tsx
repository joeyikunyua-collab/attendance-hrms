import { useState, type FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { useSettings } from "@/lib/SettingsContext";
import { leaveTypeLabel, formatDateRange } from "./leaveTypeLabels";
import type { LeaveRequest } from "@/types";

export default function ReviewRequestModal({
  request,
  decision,
  onClose,
  onReviewed,
}: {
  request: LeaveRequest | null;
  decision: "approved" | "rejected" | null;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const { settings } = useSettings();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isOpen = !!request && !!decision;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!request || !decision) return;
    setSubmitting(true);
    try {
      await api.post(`/leave-requests/${request._id}/${decision === "approved" ? "approve" : "reject"}`, { note });
      addToast({
        title: decision === "approved" ? "Request approved" : "Request rejected",
        description: `${request.employee.name} will be notified.`,
        severity: "success",
      });
      setNote("");
      onReviewed();
      onClose();
    } catch (err) {
      addToast({
        title: "Couldn't submit review",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setNote("");
        onClose();
      }}
      placement="center"
      size="lg"
    >
      <ModalContent>
        <ModalHeader>{decision === "approved" ? "Approve request" : "Reject request"}</ModalHeader>
        <ModalBody>
          {request && (
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 mb-3 text-sm">
              <p className="font-medium text-slate-800">{request.employee.name}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {leaveTypeLabel(request.type, settings.leaveTypes)} · {formatDateRange(request.startDate, request.endDate)} ·{" "}
                {request.totalDays} day{request.totalDays === 1 ? "" : "s"}
              </p>
              {request.reason && <p className="text-slate-600 text-xs mt-2 whitespace-pre-line">{request.reason}</p>}
            </div>
          )}
          <form id="review-request-form" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-800 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={decision === "approved" ? "Optional note for the employee..." : "Let them know why, if helpful..."}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color={decision === "approved" ? "success" : "danger"}
            type="submit"
            form="review-request-form"
            isLoading={submitting}
          >
            {decision === "approved" ? "Approve" : "Reject"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
