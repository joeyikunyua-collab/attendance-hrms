import { useState, FormEvent } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, addToast } from "@heroui/react";
import { TextField, Label, Input, FieldError } from "react-aria-components";
import api from "@/lib/axios";
import { getErrorMessage } from "@/lib/errors";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 data-[invalid]:border-red-500";

function FormField({
  label,
  value,
  onChange,
  validate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  validate?: (value: string) => string | null;
}) {
  return (
    <TextField isRequired type="password" value={value} onChange={onChange} validate={validate}>
      <Label className="block text-sm font-medium text-slate-800 mb-1">
        {label}
        <span className="text-red-500 ml-0.5">*</span>
      </Label>
      <Input className={inputClass} />
      <FieldError className="block text-xs text-red-600 mt-1" />
    </TextField>
  );
}

export default function SetPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose?: () => void }) {
  // No onClose means this is the mandatory first-login flow (mustChangePassword) -
  // stays non-dismissable. Passed an onClose (opened voluntarily from Account
  // Settings) means the user can back out any time.
  const forced = !onClose;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/set-password", { newPassword });
      addToast({
        title: "Password updated",
        description: "Your password has been changed.",
        severity: "success",
      });
      window.location.reload();
    } catch (err) {
      const message = getErrorMessage(err, "Failed to update password");
      setError(message);
      addToast({ title: "Failed to update password", description: message, severity: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      isDismissable={!forced}
      isKeyboardDismissDisabled={forced}
      hideCloseButton={forced}
    >
      <ModalContent>
        <ModalHeader>{forced ? "Set a new password" : "Change your password"}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-slate-500 -mt-2 mb-2">
            {forced
              ? "You're using a temporary password. Please set your own before continuing."
              : "Choose a new password for your account."}
          </p>
          <form id="set-password-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <FormField
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              validate={(value) => (value.length < 8 ? "Password must be at least 8 characters" : null)}
            />
            <FormField
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              validate={(value) => (value !== newPassword ? "Passwords do not match" : null)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </ModalBody>
        <ModalFooter>
          {!forced && (
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
          )}
          <Button color="primary" type="submit" form="set-password-form" isLoading={submitting}>
            Set password
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
