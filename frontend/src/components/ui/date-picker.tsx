import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string; // yyyy-MM-dd format
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  iconColor?: string; // tailwind text color class for the calendar icon
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  label,
  required,
  className,
  iconColor,
}: DatePickerProps) {
  const { theme } = useTheme();
  const [open, setOpen] = React.useState(false);

  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  const iconColorClass = iconColor || (theme === "dark" ? "text-orange-400" : "text-orange-500");

  return (
    <div className={className}>
      {label && (
        <label
          className={`block text-sm font-medium mb-1.5 ${
            theme === "dark" ? "text-slate-300" : "text-slate-700"
          }`}
        >
          <CalendarIcon className={`w-3.5 h-3.5 inline mr-1.5 -mt-0.5 ${iconColorClass}`} />
          {label}
          {required && " *"}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 sm:px-4 border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 text-left",
              theme === "dark"
                ? "border-slate-700 bg-slate-800/50 hover:bg-slate-800/70"
                : "border-slate-200 bg-white hover:bg-slate-50",
              dateValue
                ? theme === "dark"
                  ? "text-white"
                  : "text-slate-900"
                : theme === "dark"
                  ? "text-slate-500"
                  : "text-slate-400"
            )}
          >
            <span>{dateValue ? format(dateValue, "dd MMM yyyy") : placeholder}</span>
            <CalendarIcon className={`w-4 h-4 shrink-0 ${iconColorClass}`} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "w-auto p-0 border rounded-2xl shadow-xl",
            theme === "dark"
              ? "bg-slate-900 border-slate-700/50"
              : "bg-white border-slate-200"
          )}
          align="start"
          sideOffset={6}
        >
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleSelect}
            defaultMonth={dateValue || new Date()}
            classNames={{
              caption_label: cn(
                "text-sm font-semibold",
                theme === "dark" ? "text-white" : "text-slate-900"
              ),
              weekday: cn(
                "w-9 font-medium text-[0.75rem]",
                theme === "dark" ? "text-slate-500" : "text-slate-500"
              ),
              day_button: cn(
                "h-9 w-9 p-0 font-normal rounded-lg transition-colors",
                theme === "dark"
                  ? "text-slate-300 hover:bg-orange-500/20 hover:text-orange-300"
                  : "text-slate-700 hover:bg-orange-500/10 hover:text-orange-600"
              ),
              today: cn(
                "ring-1 rounded-lg font-semibold",
                theme === "dark"
                  ? "ring-orange-500/50 text-orange-400"
                  : "ring-orange-500/50 text-orange-600"
              ),
              outside: "opacity-30",
              button_previous: cn(
                "absolute left-1 top-0 inline-flex items-center justify-center rounded-lg w-8 h-8 p-0 transition-colors",
                theme === "dark"
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              ),
              button_next: cn(
                "absolute right-1 top-0 inline-flex items-center justify-center rounded-lg w-8 h-8 p-0 transition-colors",
                theme === "dark"
                  ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              ),
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
