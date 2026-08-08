import { useEffect, useState, type FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";
import { defaultWishMessage, type Celebration } from "./celebrationUtils";

export default function SendWishModal({ celebration, onClose }: { celebration: Celebration | null; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (celebration) setMessage(defaultWishMessage(celebration));
  }, [celebration]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!celebration) return;
    setSubmitting(true);
    try {
      await api.post(`/notifications/wish/${celebration.employeeId}`, { message });
      addToast({ title: "Wish sent", description: `${celebration.name} will see your greeting.`, severity: "success" });
      onClose();
    } catch (err) {
      addToast({
        title: "Couldn't send wish",
        description: getErrorMessage(err, "Something went wrong. Please try again."),
        severity: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={!!celebration} onClose={onClose} placement="center" size="lg">
      <ModalContent>
        <ModalHeader>{celebration?.type === "birthday" ? "Send a birthday wish" : "Send a congratulations"}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-slate-500 -mt-2 mb-2">To {celebration?.name}</p>
          <form id="send-wish-form" onSubmit={handleSubmit}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" type="submit" form="send-wish-form" isLoading={submitting}>
            Send wish
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
