'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from 'cn';

export interface SearchableSelectOption {
    value: string;
    label: string;
    subLabel?: string;
    description?: string;
}

export interface SearchableSelectProps {
    id?: string;
    value?: string;
    onChange?: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    className?: string;
    clearable?: boolean;
    required?: boolean;
}

export function SearchableSelect({
    id,
    value = '',
    onChange,
    options = [],
    placeholder = '-- เลือก --',
    searchPlaceholder = 'พิมพ์เพื่อค้นหา...',
    emptyText = 'ไม่พบข้อมูลที่ค้นหา',
    disabled = false,
    className,
    clearable = true,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // หา option ที่ถูกเลือกอยู่ในปัจจุบัน
    const selectedOption = useMemo(() => {
        return options.find((opt) => String(opt.value) === String(value));
    }, [options, value]);

    // กรอง options ตาม search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const q = searchQuery.toLowerCase().trim();
        return options.filter((opt) => {
            const matchLabel = opt.label.toLowerCase().includes(q);
            const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
            const matchValue = opt.value.toLowerCase().includes(q);
            return matchLabel || matchSub || matchValue;
        });
    }, [options, searchQuery]);

    // เมื่อเปิด dropdown ให้โฟกัสที่ search input
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleOpenChange = (open: boolean) => {
        if (disabled) return;
        setIsOpen(open);
        if (open) {
            setSearchQuery('');
            setHighlightedIndex(-1);
        }
    };

    // ควบคุมการเลือก
    const handleSelect = (val: string) => {
        onChange?.(val);
        setIsOpen(false);
    };

    // ล้างค่าที่เลือก
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange?.('');
        setSearchQuery('');
    };

    const scrollIntoView = (index: number) => {
        if (!listRef.current) return;
        const items = listRef.current.children;
        if (items[index]) {
            (items[index] as HTMLElement).scrollIntoView({
                block: 'nearest',
            });
        }
    };

    // Keyboard navigation เมื่ออยู่ในช่องค้นหา
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) => {
                const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
                scrollIntoView(next);
                return next;
            });
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => {
                const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
                scrollIntoView(next);
                return next;
            });
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                handleSelect(filteredOptions[highlightedIndex].value);
            } else if (filteredOptions.length === 1) {
                handleSelect(filteredOptions[0].value);
            }
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
        }
    };

    return (
        <div className={cn('relative w-full', className)}>
            <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
                <PopoverPrimitive.Trigger
                    disabled={disabled}
                    render={
                        <button
                            id={id}
                            type="button"
                            className={cn(
                                'w-full h-10 px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm flex items-center justify-between gap-2 text-left transition-all cursor-pointer select-none',
                                disabled && 'opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800/50',
                                isOpen && 'ring-2 ring-blue-500 border-blue-500'
                            )}
                        />
                    }
                >
                    <span className={cn('truncate flex-1', !selectedOption && 'text-zinc-400 dark:text-zinc-500')}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {clearable && selectedOption && !disabled && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={handleClear}
                                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                title="ล้างข้อมูลที่เลือก"
                            >
                                <X className="w-3.5 h-3.5" />
                            </span>
                        )}
                        <ChevronDown
                            className={cn(
                                'w-4 h-4 text-zinc-400 transition-transform duration-200',
                                isOpen && 'rotate-180 text-blue-600'
                            )}
                        />
                    </div>
                </PopoverPrimitive.Trigger>

                <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Positioner
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        className="isolate z-50"
                    >
                        <PopoverPrimitive.Popup
                            className="w-[var(--anchor-width)] min-w-[220px] max-h-[360px] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
                        >
                            {/* Search Input Box */}
                            <div className="p-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 shrink-0">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setHighlightedIndex(-1);
                                        }}
                                        onKeyDown={handleInputKeyDown}
                                        placeholder={searchPlaceholder}
                                        className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Options List */}
                            <ul
                                ref={listRef}
                                className="max-h-60 overflow-y-auto p-1 text-sm focus:outline-none"
                            >
                                {clearable && (
                                    <li
                                        onClick={() => handleSelect('')}
                                        className={cn(
                                            'px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
                                            !value && 'bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-800 dark:text-zinc-200'
                                        )}
                                    >
                                        <span>{placeholder}</span>
                                        {!value && <Check className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                                    </li>
                                )}

                                {filteredOptions.length === 0 ? (
                                    <li className="py-6 text-center text-xs text-zinc-400">
                                        {emptyText}
                                    </li>
                                ) : (
                                    filteredOptions.map((opt, index) => {
                                        const isSelected = String(opt.value) === String(value);
                                        const isHighlighted = index === highlightedIndex;

                                        return (
                                            <li
                                                key={opt.value}
                                                onClick={() => handleSelect(opt.value)}
                                                onMouseEnter={() => setHighlightedIndex(index)}
                                                className={cn(
                                                    'px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors',
                                                    isSelected
                                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 font-semibold'
                                                        : isHighlighted
                                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                                                )}
                                            >
                                                <div className="flex flex-col gap-0.5 truncate pr-2">
                                                    <span className="truncate">{opt.label}</span>
                                                    {opt.subLabel && (
                                                        <span className="text-[10px] text-zinc-400 font-normal truncate">
                                                            {opt.subLabel}
                                                        </span>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                                )}
                                            </li>
                                        );
                                    })
                                )}
                            </ul>
                        </PopoverPrimitive.Popup>
                    </PopoverPrimitive.Positioner>
                </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
        </div>
    );
}

export default SearchableSelect;
