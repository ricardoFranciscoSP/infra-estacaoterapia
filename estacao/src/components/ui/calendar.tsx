"use client"
import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayButton,
  DayPicker,
  DayPickerProps,
  getDefaultClassNames,
  type DateRange,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { ptBR } from "date-fns/locale"

interface CalendarPropsBase extends Omit<DayPickerProps, "mode" | "selected" | "onSelect"> {
  className?: string;
  classNames?: Record<string, string>;
  showOutsideDays?: boolean;
  captionLayout?: "label" | "dropdown";
  formatters?: {
    formatMonthCaption?: (month: Date) => string;
    formatWeekdayName?: (day: Date) => string;
    formatMonthDropdown?: (month: Date) => string;
    formatYearDropdown?: (year: Date) => string;
  };
  components?: DayPickerProps["components"];
}

interface CalendarPropsSingle extends CalendarPropsBase {
  mode: "single";
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
}

interface CalendarPropsRange extends CalendarPropsBase {
  mode: "range";
  selected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
}

type CalendarProps = CalendarPropsSingle | CalendarPropsRange;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "dropdown",
  formatters,
  components,
  selected,
  onSelect,
  mode,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()


  if (mode === "single") {
    return (
      <DayPicker
        mode="single"
        selected={selected as Date | undefined}
        onSelect={onSelect as ((date: Date | undefined) => void) | undefined}
        showOutsideDays={showOutsideDays}
        locale={ptBR}
        captionLayout="dropdown"
        className={cn(
          "bg-white text-black group/calendar p-3 [--cell-size:2.5rem] border border-[#E3E6E8] rounded-lg",
          className
        )}
        formatters={{
          formatMonthDropdown: (date) =>
            date.toLocaleString("pt-BR", { month: "long" }),
          ...formatters,
        }}
        classNames={{
          root: cn("w-fit", defaultClassNames.root),
          months: cn(
            "flex gap-4 flex-col md:flex-row relative",
            defaultClassNames.months
          ),
          month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
          nav: cn(
            "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
            defaultClassNames.nav
          ),
          button_previous: cn(
            "bg-transparent text-black rounded-md p-0 size-[32px] aria-disabled:opacity-50 select-none flex items-center justify-center",
            defaultClassNames.button_previous
          ),
          button_next: cn(
            "bg-transparent text-black rounded-md p-0 size-[32px] aria-disabled:opacity-50 select-none flex items-center justify-center",
            defaultClassNames.button_next
          ),
          month_caption: cn(
            "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
            defaultClassNames.month_caption
          ),
          dropdowns: cn(
            "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-4",
            "flex-row",
            defaultClassNames.dropdowns
          ),
          dropdown_root: cn(
            "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
            defaultClassNames.dropdown_root
          ),
          dropdown: cn(
            "absolute bg-popover inset-0 opacity-0",
            defaultClassNames.dropdown
          ),
          caption_label: cn(
            "select-none font-medium flex items-center gap-2",
            captionLayout === "label"
              ? "text-sm"
              : "rounded-md pl-2 pr-1 flex items-center gap-2 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-4",
            defaultClassNames.caption_label
          ),
          table: "w-full border-collapse",
          weekdays: cn("flex", defaultClassNames.weekdays),
          weekday: cn(
            "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
            defaultClassNames.weekday
          ),
          week: cn("flex w-full mt-2", defaultClassNames.week),
          day: cn(
            "relative w-full h-full p-0 flex items-center justify-center text-center group/day aspect-square select-none",
            "m-1",
            defaultClassNames.day
          ),
          range_start: cn("rounded-l-md bg-accent", defaultClassNames.range_start),
          range_middle: cn("rounded-none", defaultClassNames.range_middle),
          range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
          today: cn(
            "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
            defaultClassNames.today
          ),
          outside: cn(
            "text-muted-foreground aria-selected:text-muted-foreground",
            defaultClassNames.outside
          ),
          disabled: cn(
            "text-muted-foreground opacity-50",
            defaultClassNames.disabled
          ),
          hidden: cn("invisible", defaultClassNames.hidden),
          ...classNames,
        }}
        components={{
          Root: ({ className, rootRef, ...slotProps }) => {
            return <div ref={rootRef} className={cn(className)} {...slotProps} />
          },
          Chevron: ({ className, orientation, ...slotProps }) => {
            if (orientation === "left")
              return <ChevronLeftIcon className={cn("size-4", className)} {...slotProps} />

            if (orientation === "right")
              return <ChevronRightIcon className={cn("size-4", className)} {...slotProps} />

            return <ChevronDownIcon className={cn("size-4", className)} {...slotProps} />
          },
          DayButton: CalendarDayButton,
          ...(components ?? {}),
        }}
        {...props}
      />
    );
  }
  // modo range
  return (
    <DayPicker
      mode="range"
      selected={selected as DateRange | undefined}
      onSelect={onSelect as ((range: DateRange | undefined) => void) | undefined}
      showOutsideDays={showOutsideDays}
      locale={ptBR}
      captionLayout="dropdown"
      className={cn(
        "bg-white text-black group/calendar p-3 [--cell-size:2.5rem] border border-[#E3E6E8] rounded-lg",
        className
      )}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("pt-BR", { month: "long" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "bg-transparent text-black rounded-md p-0 size-[32px] aria-disabled:opacity-50 select-none flex items-center justify-center",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "bg-transparent text-black rounded-md p-0 size-[32px] aria-disabled:opacity-50 select-none flex items-center justify-center",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-4",
          "flex-row",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute bg-popover inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium flex items-center gap-2",
          captionLayout === "label"
            ? "text-sm"
            : "rounded-md pl-2 pr-1 flex items-center gap-2 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-4",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        day: cn(
          "relative w-full h-full p-0 flex items-center justify-center text-center group/day aspect-square select-none",
          "m-1",
          defaultClassNames.day
        ),
        range_start: cn("rounded-l-md bg-accent", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...slotProps }) => {
          return <div ref={rootRef} className={cn(className)} {...slotProps} />
        },
        Chevron: ({ className, orientation, ...slotProps }) => {
          if (orientation === "left")
            return <ChevronLeftIcon className={cn("size-4", className)} {...slotProps} />

          if (orientation === "right")
            return <ChevronRightIcon className={cn("size-4", className)} {...slotProps} />

          return <ChevronDownIcon className={cn("size-4", className)} {...slotProps} />
        },
        DayButton: CalendarDayButton,
        ...(components ?? {}),
      }}
      {...props}
    />
  );

}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "bg-white text-black border border-[#E3E6E8] flex aspect-square w-full min-w-[32px] flex-col gap-1 leading-none font-normal relative z-10 rounded-md [&>span]:text-xs [&>span]:opacity-70 items-center justify-center text-center",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
