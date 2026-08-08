import {
  DatePicker,
  Group,
  DateInput,
  DateSegment,
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
  Label,
} from "react-aria-components";
import { parseDate } from "@internationalized/date";

export const dateGroupClass =
  "flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm " +
  "focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500";

export default function DateFilterField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <DatePicker value={parseDate(value)} onChange={(date) => date && onChange(date.toString())}>
      <Label className="block text-xs text-slate-500 mb-1">{label}</Label>
      <Group className={dateGroupClass}>
        <DateInput className="flex flex-1">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="px-0.5 tabular-nums outline-none rounded focus:bg-blue-100"
            />
          )}
        </DateInput>
        <Button className="text-slate-400 hover:text-slate-600">▾</Button>
      </Group>
      <Popover className="mt-1 rounded-lg border border-slate-200 bg-white shadow-lg p-3 z-50">
        <Dialog aria-label={label} className="outline-none">
          <Calendar aria-label={label}>
            <header className="flex items-center justify-between mb-2">
              <Button slot="previous" className="px-2 text-slate-500 hover:text-slate-800">
                ◀
              </Button>
              <Heading className="text-sm font-medium text-slate-800" />
              <Button slot="next" className="px-2 text-slate-500 hover:text-slate-800">
                ▶
              </Button>
            </header>
            <CalendarGrid className="text-sm">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="text-xs text-slate-400 font-normal pb-1">
                    {day}
                  </CalendarHeaderCell>
                )}
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
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}
