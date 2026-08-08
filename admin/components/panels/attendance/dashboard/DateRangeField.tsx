import { useState } from "react";
import {
  DialogTrigger,
  Button,
  Popover,
  Dialog,
  Calendar,
  CalendarGrid,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarGridBody,
  CalendarCell,
  Heading,
} from "react-aria-components";
import { parseDate } from "@internationalized/date";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";

function formatRangeLabel(from: string, to: string) {
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  const fromLabel = f.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const toLabel = t.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fromLabel} – ${toLabel}`;
}

const miniCalendarGrid = (
  <CalendarGrid className="text-sm">
    <CalendarGridHeader>
      {(day) => <CalendarHeaderCell className="text-xs text-slate-400 font-normal pb-1">{day}</CalendarHeaderCell>}
    </CalendarGridHeader>
    <CalendarGridBody>
      {(date) => (
        <CalendarCell
          date={date}
          className="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer hover:bg-slate-100 data-[selected]:bg-blue-600 data-[selected]:text-white data-[outside-month]:text-slate-300"
        />
      )}
    </CalendarGridBody>
  </CalendarGrid>
);

/** Single trigger button that opens a popover with a From/To calendar pair
 * and an explicit Apply - consolidates what used to be two separate
 * DateFilterFields into one control, matching the "Aug 3 - Aug 9 ▾" pattern
 * from the reference design. Only commits (and triggers the caller's fetch)
 * when Apply is clicked, so picking both ends doesn't fire two fetches. */
export default function DateRangeField({
  from,
  to,
  onApply,
}: {
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
}) {
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  return (
    <DialogTrigger>
      <Button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
        {formatRangeLabel(from, to)}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </Button>
      <Popover className="mt-1 rounded-xl border border-slate-200 bg-white shadow-lg p-3 z-50">
        <Dialog aria-label="Select date range" className="outline-none">
          {({ close }) => (
            <div>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5 px-1">From</p>
                  <Calendar
                    aria-label="From date"
                    value={parseDate(draftFrom)}
                    maxValue={parseDate(draftTo)}
                    onChange={(d) => d && setDraftFrom(d.toString())}
                  >
                    <header className="flex items-center justify-between mb-2">
                      <Button slot="previous" className="px-2 text-slate-500 hover:text-slate-800">
                        ◀
                      </Button>
                      <Heading className="text-sm font-medium text-slate-800" />
                      <Button slot="next" className="px-2 text-slate-500 hover:text-slate-800">
                        ▶
                      </Button>
                    </header>
                    {miniCalendarGrid}
                  </Calendar>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5 px-1">To</p>
                  <Calendar
                    aria-label="To date"
                    value={parseDate(draftTo)}
                    minValue={parseDate(draftFrom)}
                    onChange={(d) => d && setDraftTo(d.toString())}
                  >
                    <header className="flex items-center justify-between mb-2">
                      <Button slot="previous" className="px-2 text-slate-500 hover:text-slate-800">
                        ◀
                      </Button>
                      <Heading className="text-sm font-medium text-slate-800" />
                      <Button slot="next" className="px-2 text-slate-500 hover:text-slate-800">
                        ▶
                      </Button>
                    </header>
                    {miniCalendarGrid}
                  </Calendar>
                </div>
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    onApply(draftFrom, draftTo);
                    close();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3.5 py-1.5"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
