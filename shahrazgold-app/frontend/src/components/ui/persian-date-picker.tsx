import { useState } from "react";
import { CalendarDays, Clock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatPersianDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type PersianDatePickerProps = {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    min?: string;
    max?: string;
    disabled?: boolean;
    allowClear?: boolean;
    className?: string;
};

function parseIsoDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return undefined;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 12);

    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return undefined;
    }

    return date;
}

function toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function todayIsoDate(): string {
    return toIsoDate(new Date());
}

export function PersianDatePicker({
    id,
    value,
    onChange,
    placeholder = "انتخاب تاریخ",
    min,
    max,
    disabled = false,
    allowClear = true,
    className,
}: PersianDatePickerProps) {
    const [open, setOpen] = useState(false);
    const selected = parseIsoDate(value);
    const minDate = parseIsoDate(min);
    const maxDate = parseIsoDate(max);
    const currentYear = new Date().getFullYear();

    return (
        <div className={cn("relative min-w-0", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "h-10 w-full min-w-0 justify-start gap-2 px-3 text-right font-normal",
                            !selected && "text-muted-foreground",
                            selected && allowClear && "pe-9",
                        )}
                    >
                        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                            {selected ? formatPersianDate(selected) : placeholder}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-auto max-w-[calc(100vw-2rem)] p-0"
                    dir="rtl"
                >
                    <Calendar
                        mode="single"
                        selected={selected}
                        defaultMonth={selected}
                        onSelect={(date) => {
                            if (!date) return;
                            onChange(toIsoDate(date));
                            setOpen(false);
                        }}
                        disabled={[
                            ...(minDate ? [{ before: minDate }] : []),
                            ...(maxDate ? [{ after: maxDate }] : []),
                        ]}
                        captionLayout="dropdown"
                        startMonth={new Date(currentYear - 100, 0, 1, 12)}
                        endMonth={new Date(currentYear + 20, 11, 31, 12)}
                    />
                </PopoverContent>
            </Popover>
            {selected && allowClear && !disabled ? (
                <button
                    type="button"
                    aria-label="پاک کردن تاریخ"
                    title="پاک کردن تاریخ"
                    onClick={() => onChange("")}
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            ) : null}
        </div>
    );
}

type PersianDateTimePickerProps = Omit<
    PersianDatePickerProps,
    "value" | "onChange" | "min" | "max" | "className"
> & {
    value: string;
    onChange: (value: string) => void;
    className?: string;
};

export function PersianDateTimePicker({
    value,
    onChange,
    className,
    placeholder,
    ...props
}: PersianDateTimePickerProps) {
    const date = value.slice(0, 10);
    const time = value.length >= 16 ? value.slice(11, 16) : "";

    return (
        <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)_7.5rem] gap-2", className)}>
            <PersianDatePicker
                {...props}
                value={date}
                placeholder={placeholder}
                onChange={(nextDate) => onChange(nextDate ? `${nextDate}T${time || "00:00"}` : "")}
            />
            <div className="relative min-w-0">
                <Clock className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="time"
                    value={time}
                    disabled={props.disabled}
                    aria-label="ساعت"
                    dir="ltr"
                    onChange={(event) =>
                        onChange(`${date || todayIsoDate()}T${event.target.value || "00:00"}`)
                    }
                    className="pe-2 ps-9"
                />
            </div>
        </div>
    );
}
