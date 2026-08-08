import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import { employeeRefId } from "@/lib/employeeRef";
import { hasJoinedBy } from "@/lib/dates";
import type { AttendanceRecord, Employee } from "@/types";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function PresentAbsentListModal({
  isOpen,
  onClose,
  date,
  type,
  employees,
  records,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  type: "present" | "absent";
  employees: Employee[];
  records: AttendanceRecord[];
}) {
  const recordByEmployeeId = new Map<string, AttendanceRecord>();
  for (const r of records) {
    const empId = employeeRefId(r.employee);
    if (!empId) continue;
    recordByEmployeeId.set(empId, r);
  }

  const rows = employees
    .filter((emp) => hasJoinedBy(emp.createdAt, date))
    .filter((emp) => {
      const record = recordByEmployeeId.get(emp._id);
      const hasCheckIn = !!record?.checkIn;
      return type === "present" ? hasCheckIn : !hasCheckIn;
    })
    .map((emp) => ({ employee: emp, record: recordByEmployeeId.get(emp._id) ?? null }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          {type === "present" ? "Present" : "Absent"} · {date}
        </ModalHeader>
        <ModalBody className="pb-6">
          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide">Name</th>
                  {type === "present" && (
                    <>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide">
                        Check-in
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide">
                        Check-out
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-6 text-center text-slate-500"
                      colSpan={type === "present" ? 3 : 1}
                    >
                      No employees {type === "present" ? "checked in" : "absent"} this day.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ employee, record }) => (
                    <tr key={employee._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-800">
                        {employee.name}
                      </td>
                      {type === "present" && (
                        <>
                          <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                            {formatTime(record?.checkIn ?? null)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-slate-600">
                            {formatTime(record?.checkOut ?? null)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
