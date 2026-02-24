import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold",
        nav: "flex items-center gap-1",
        button_previous: "absolute left-1 top-0 inline-flex items-center justify-center rounded-lg w-8 h-8 bg-transparent p-0 opacity-70 hover:opacity-100 transition-opacity",
        button_next: "absolute right-1 top-0 inline-flex items-center justify-center rounded-lg w-8 h-8 bg-transparent p-0 opacity-70 hover:opacity-100 transition-opacity",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button: "h-9 w-9 p-0 font-normal rounded-lg hover:bg-orange-500/20 hover:text-orange-400 focus:bg-orange-500/20 focus:text-orange-400 transition-colors",
        selected: "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 rounded-lg font-semibold",
        today: "ring-1 ring-orange-500/50 rounded-lg font-semibold",
        outside: "opacity-40",
        disabled: "opacity-30 cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
