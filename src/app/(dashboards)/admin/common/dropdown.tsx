"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  descriptionTone?: "default" | "danger";
  indentLevel?: number;
  parentValue?: string;
  hasChildren?: boolean;
  disabled?: boolean;
  groupLabel?: boolean;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  treeMode?: boolean;
}

export default function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  required = false,
  treeMode = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedValues, setExpandedValues] = useState<Record<number, string>>(
    {},
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const optionsByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );

  const selectedOption = useMemo(() => {
    return options.find(
      (option) => !option.groupLabel && option.value === value,
    );
  }, [options, value]);

  const visibleOptions = useMemo(() => {
    if (!treeMode) {
      return options;
    }

    return options.filter((option) => {
      if (option.groupLabel || !option.parentValue) {
        return true;
      }

      let currentParentValue: string | undefined = option.parentValue;

      while (currentParentValue) {
        const parentOption = optionsByValue.get(currentParentValue);

        if (!parentOption) {
          return false;
        }

        if (
          expandedValues[parentOption.indentLevel ?? 0] !== parentOption.value
        ) {
          return false;
        }

        currentParentValue = parentOption.parentValue;
      }

      return true;
    });
  }, [expandedValues, options, optionsByValue, treeMode]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  const getExpandedValuesForSelectedOption = () => {
    const nextExpandedValues: Record<number, string> = {};
    let currentOption = value ? optionsByValue.get(value) : undefined;

    while (currentOption?.parentValue) {
      const parentOption = optionsByValue.get(currentOption.parentValue);

      if (!parentOption) {
        break;
      }

      nextExpandedValues[parentOption.indentLevel ?? 0] = parentOption.value;
      currentOption = parentOption;
    }

    return nextExpandedValues;
  };

  const displayText =
    selectedOption?.label || (value ? String(value) : placeholder);
  const isPlaceholderActive = !selectedOption && !value && Boolean(placeholder);

  const toggleBranch = (option: DropdownOption) => {
    const optionLevel = option.indentLevel ?? 0;

    setExpandedValues((previousExpandedValues) => {
      const nextExpandedValues = Object.fromEntries(
        Object.entries(previousExpandedValues).filter(
          ([level]) => Number(level) < optionLevel,
        ),
      ) as Record<number, string>;

      if (previousExpandedValues[optionLevel] === option.value) {
        return nextExpandedValues;
      }

      nextExpandedValues[optionLevel] = option.value;
      return nextExpandedValues;
    });
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-secondary mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          if (disabled) return;

          const nextIsOpen = !isOpen;

          if (treeMode) {
            setExpandedValues(
              nextIsOpen ? getExpandedValuesForSelectedOption() : {},
            );
          }

          setIsOpen(nextIsOpen);
        }}
        disabled={disabled}
        className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-200 text-sm font-normal leading-[19.2px] tracking-normal appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTciIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxNyAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUuMjQ4NjEgNi4zNzQ3Nkw4LjUwNDM3IDkuNjMwNTFMMTEuNzYwMSA2LjM3NDc2TDEyLjc1NjggNy4zNzE0Mkw4LjUwNDM3IDExLjYyMzhMNC4yNTE5NSA3LjM3MTQyTDUuMjQ4NjEgNi4zNzQ3NloiIGZpbGw9IiM5OTk5OTkiLz4KPC9zdmc+Cg==')] bg-size-[17px_18px] bg-position-[right_1rem_center] bg-no-repeat pr-12 text-left flex items-center justify-between ${
          disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"
        } border-zinc-200`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={isPlaceholderActive ? "text-gray" : "text-secondary"}>
          {displayText}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {visibleOptions.map((option) => {
            if (option.groupLabel) {
              return (
                <div
                  key={option.value}
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400 bg-zinc-50 border-b border-zinc-100"
                >
                  {option.label}
                </div>
              );
            }

            const isSelected = option.value === value;
            const isExpanded =
              expandedValues[option.indentLevel ?? 0] === option.value;
            const paddingLeft = 16 + (option.indentLevel ?? 0) * 18;

            return (
              <div
                key={option.value}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  isSelected
                    ? "bg-zinc-100 text-secondary"
                    : "text-gray hover:bg-zinc-50"
                }`}
                style={{ paddingLeft }}
              >
                {treeMode ? (
                  option.hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleBranch(option)}
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                      aria-label={
                        isExpanded ? "Collapse options" : "Expand options"
                      }
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        <path
                          d="M4.5 2.5L7.5 6L4.5 9.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  ) : (
                    <span className="h-5 w-5 shrink-0" />
                  )
                ) : null}

                <button
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    setIsOpen(false);
                    if (!onChange) return;
                    const fakeEvent = {
                      target: { value: option.value },
                    } as unknown as React.ChangeEvent<HTMLSelectElement>;
                    onChange(fakeEvent);
                  }}
                  className={`flex min-w-0 flex-1 items-center justify-between gap-3 text-left ${
                    option.disabled
                      ? "cursor-not-allowed text-zinc-400"
                      : isSelected
                        ? "font-medium text-secondary"
                        : ""
                  }`}
                >
                  <span className="min-w-0 pr-3">
                    <span className="block truncate">{option.label}</span>
                    {option.description && (
                      <span
                        className={`mt-0.5 block truncate text-xs font-normal ${
                          option.descriptionTone === "danger"
                            ? "text-red-500"
                            : "text-zinc-400"
                        }`}
                      >
                        {option.description}
                      </span>
                    )}
                  </span>

                  {isSelected && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="shrink-0 text-secondary"
                    >
                      <path
                        d="M13.3334 4L6.00002 11.3333L2.66669 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
