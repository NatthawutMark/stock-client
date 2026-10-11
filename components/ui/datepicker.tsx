"use client"

import * as React from "react"
import { cn } from "cn"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
    value?: string | Date;
    isRequire?: boolean;
    onChange?: (value: string) => void;
    onDateChange?: (date?: Date) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    formatString?: string;
    clearable?: boolean;
    id?: string;
}

/**
 * แปลงค่า value (ที่เป็นได้ทั้ง string 'YYYY-MM-DD' หรือ Date) ให้เป็น Date object ในเขตเวลาท้องถิ่น
 */
function parseDateValue(val?: string | Date): Date | undefined {
    if (!val) return undefined;
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? undefined : val;
    }
    if (typeof val === "string") {
        const trimmed = val.trim();
        if (!trimmed) return undefined;
        // กรณีรูปแบบ 'YYYY-MM-DD'
        const parts = trimmed.split("T")[0].split("-");
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const parsed = new Date(y, m, d);
            return isNaN(parsed.getTime()) ? undefined : parsed;
        }
        const d = new Date(trimmed);
        return isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
}

export function DatePicker({
    value,
    onChange,
    onDateChange,
    isRequire = false,
    placeholder = "เลือกวันที่ (Select date)...",
    className,
    disabled = false,
    formatString = "dd/MM/yyyy",
    clearable = false,
    id,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);
    // const [isRequire, setIsrequire] = React.useState<boolean>(false)
    const selectedDate = React.useMemo(() => parseDateValue(value), [value]);

    const handleSelect = (date?: Date) => {
        if (date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, "0");
            const d = String(date.getDate()).padStart(2, "0");
            const dateStr = `${y}-${m}-${d}`;
            onChange?.(dateStr);
            onDateChange?.(date);
        } else {
            onChange?.("");
            onDateChange?.(undefined);
        }
        setOpen(false);
    };

    const displayText = selectedDate
        ? format(selectedDate, formatString, { locale: th })
        : placeholder;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "w-full h-10 px-3.5 text-sm font-normal justify-start text-left rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-all cursor-pointer select-none",
                            !selectedDate && "text-zinc-400 dark:text-zinc-500",
                            className
                        )}
                    />
                }
            >
                <CalendarIcon className="mr-2.5 h-4 w-4 text-blue-500 shrink-0" />
                <span className="flex-1 truncate">{displayText}</span>
                {clearable && selectedDate && !disabled && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(undefined);
                        }}
                        className="ml-2 p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"
                    >
                        <X className="h-3.5 w-3.5" />
                    </span>
                )}
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl"
                align="start"
                sideOffset={6}
            >
                <Calendar
                    mode="single"
                    required={isRequire}
                    selected={selectedDate}
                    onSelect={handleSelect}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    );
}