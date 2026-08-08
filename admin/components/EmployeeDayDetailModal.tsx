import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";

export interface DayDetail {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  notes?: string;
}

export default function EmployeeDayDetailModal({
  isOpen,
  onClose,
  employeeName,
  days,
}: {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  days: DayDetail[];
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{employeeName}</ModalHeader>
        <ModalBody className="pb-6">
          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide">Date</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide">Check-in</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide">Check-out</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {days.map((d) => (
                  <tr key={d.date} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-800">{d.date}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{d.checkIn ?? "—"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{d.checkOut ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{d.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
